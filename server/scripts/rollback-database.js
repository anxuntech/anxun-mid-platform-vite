import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMigrationConnection } from '../db/mysql.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationVersion = process.argv[2] || '003_connector_scoped_dedup'
const migrationFile = path.resolve(
  here,
  '..',
  '..',
  'database',
  'migrations',
  `${migrationVersion}.down.sql`,
)
const allowed = process.env.ALLOW_DATABASE_MIGRATION_ROLLBACK === 'true'

if (!allowed) {
  throw new Error(
    'rollback-disabled:set ALLOW_DATABASE_MIGRATION_ROLLBACK=true after reviewing the target migration',
  )
}

const connection = await createMigrationConnection()

try {
  if (migrationVersion === '001_initial_schema') {
    if (process.env.ALLOW_EMPTY_DATABASE_ROLLBACK !== 'true') {
      throw new Error('initial-schema-rollback-requires-empty-database-confirmation')
    }
    const [tables] = await connection.query(
      `
      SELECT TABLE_NAME AS table_name
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (
          'webhook_events',
          'business_records',
          'record_attachments',
          'data_import_batches',
          'migration_logs',
          'data_quality_issues',
          'event_replay_jobs'
        )
      `,
    )

    for (const table of tables) {
      const tableName = table.table_name
      const [[row]] = await connection.query(
        `SELECT COUNT(*) AS row_count FROM \`${tableName}\``,
      )
      if (Number(row.row_count) > 0) {
        throw new Error(`rollback-refused-non-empty-table:${tableName}`)
      }
    }
  }

  const sql = await readFile(migrationFile, 'utf8')
  await connection.beginTransaction()
  try {
    await connection.query(sql)
    await connection.execute('DELETE FROM schema_migrations WHERE version = ?', [
      migrationVersion,
    ])
    await connection.commit()
    console.log(`[db:rollback] reverted empty schema ${migrationVersion}`)
  } catch (error) {
    await connection.rollback()
    throw error
  }
} finally {
  await connection.end()
}
