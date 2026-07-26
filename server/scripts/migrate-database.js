import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMigrationConnection } from '../db/mysql.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(here, '..', '..', 'database', 'migrations')

const connection = await createMigrationConnection()
let migrationLockAcquired = false

try {
  const [[lockRow]] = await connection.query(
    `SELECT GET_LOCK('anxun-schema-migrations', 10) AS acquired`,
  )
  if (Number(lockRow.acquired) !== 1) throw new Error('database-migration-lock-timeout')
  migrationLockAcquired = true

  const [migrationTableRows] = await connection.query(
    `SELECT COUNT(*) AS table_count
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'schema_migrations'`,
  )
  if (Number(migrationTableRows[0]?.table_count || 0) === 0) {
    await connection.query(`
      CREATE TABLE schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `)
  }

  const files = (await readdir(migrationsDir))
    .filter(file => file.endsWith('.up.sql'))
    .sort()

  for (const file of files) {
    const version = file.replace(/\.up\.sql$/, '')
    const sql = await readFile(path.join(migrationsDir, file), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const [rows] = await connection.execute(
      'SELECT checksum FROM schema_migrations WHERE version = ?',
      [version],
    )

    if (rows.length) {
      if (rows[0].checksum !== checksum) throw new Error(`migration-checksum-mismatch:${version}`)
      console.log(`[db:migrate] already applied ${version}`)
      continue
    }

    try {
      await connection.query(sql)
      await connection.execute(
        'INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)',
        [version, checksum],
      )
      console.log(`[db:migrate] applied ${version}`)
    } catch (error) {
      throw new Error(
        `migration-failed:${version}:DDL may have partially committed; inspect schema before retrying: ${error.message}`,
        { cause: error },
      )
    }
  }
} finally {
  if (migrationLockAcquired) {
    await connection.query(`SELECT RELEASE_LOCK('anxun-schema-migrations')`)
  }
  await connection.end()
}
