import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMigrationConnection } from '../db/mysql.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(here, '..', '..', 'database', 'migrations')

const connection = await createMigrationConnection()

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `)

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

    await connection.beginTransaction()
    try {
      await connection.query(sql)
      await connection.execute(
        'INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)',
        [version, checksum],
      )
      await connection.commit()
      console.log(`[db:migrate] applied ${version}`)
    } catch (error) {
      await connection.rollback()
      throw error
    }
  }
} finally {
  await connection.end()
}
