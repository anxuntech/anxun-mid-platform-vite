import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'

const sourceEventId = process.argv.find(value => value.startsWith('--source-event-id='))
  ?.slice('--source-event-id='.length)
if (!sourceEventId) throw new Error('missing --source-event-id')

const pool = getMysqlPool()

try {
  const [rows] = await pool.execute(
    `SELECT
       e.event_id,
       e.source_environment,
       e.parse_status,
       e.received_at,
       COUNT(DISTINCT b.record_id) AS business_record_count
     FROM webhook_events e
     LEFT JOIN business_records b ON b.raw_event_id = e.event_id
     WHERE e.source_event_id = ?
     GROUP BY e.event_id, e.source_environment, e.parse_status, e.received_at`,
    [sourceEventId],
  )
  console.log(JSON.stringify({
    success: rows.length > 0,
    sourceEventId,
    events: rows.map(row => ({
      eventId: row.event_id,
      sourceEnvironment: row.source_environment,
      parseStatus: row.parse_status,
      receivedAt: row.received_at,
      businessRecordCount: Number(row.business_record_count),
    })),
  }))
  if (!rows.length) process.exitCode = 2
} finally {
  await closeMysqlPool()
}
