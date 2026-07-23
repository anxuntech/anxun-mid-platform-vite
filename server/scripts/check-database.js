import { checkMysqlHealth, closeMysqlPool, getMysqlPool } from '../db/mysql.js'

try {
  const health = await checkMysqlHealth()
  const pool = getMysqlPool()
  await pool.query(`
    CREATE TEMPORARY TABLE p1_connection_check (
      id INT PRIMARY KEY,
      chinese_text VARCHAR(32),
      json_value JSON,
      created_at DATETIME(3)
    )
  `)
  await pool.execute(
    'INSERT INTO p1_connection_check (id, chinese_text, json_value, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))',
    [1, '平乡连接正常', JSON.stringify({ ok: true })],
  )
  const [rows] = await pool.query('SELECT id, chinese_text, json_value FROM p1_connection_check')
  console.log(JSON.stringify({
    success: true,
    version: health.version,
    database: health.database_name,
    temporaryTableRows: rows.length,
    chineseRoundTrip: rows[0]?.chinese_text === '平乡连接正常',
  }))
} finally {
  await closeMysqlPool()
}
