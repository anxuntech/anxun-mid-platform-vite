import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'
import { saveMysqlRawEvent } from '../services/mysqlEventIngestService.js'

const pool = getMysqlPool()

try {
  const [rows] = await pool.execute(
    `SELECT e.payload_json
       FROM webhook_events e
      WHERE e.source_environment = 'test'
        AND e.parse_status = 'processed'
      ORDER BY e.received_at
      LIMIT 1`,
  )
  if (!rows.length) throw new Error('replay-test-source-event-not-found')

  const sourcePayload = typeof rows[0].payload_json === 'string'
    ? JSON.parse(rows[0].payload_json)
    : rows[0].payload_json
  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const payload = structuredClone(sourcePayload)
  payload.requestId = `p1-replay-test-${uniqueSuffix}`
  payload.receivedAt = new Date().toISOString()
  payload.record = {
    ...payload.record,
    serialNumber: `${payload.record.serialNumber || 'record'}-p1-replay-${uniqueSuffix}`,
  }

  const rawContext = await saveMysqlRawEvent({
    requestId: payload.requestId,
    receivedAt: payload.receivedAt,
    headers: { source: 'p1-replay-verification' },
    payload,
    record: payload.record,
    connectorKey: 'caoliao-pingxiang-test',
  })
  if (rawContext.rawEvent.duplicate) throw new Error('replay-test-event-unexpectedly-duplicate')

  const replay = spawnSync(
    process.execPath,
    ['server/scripts/replay-webhook-event.js', `--event-id=${rawContext.rawEvent.eventId}`],
    { cwd: process.cwd(), env: process.env, encoding: 'utf8' },
  )
  if (replay.status !== 0) {
    throw new Error(`replay-command-failed:${replay.stderr || replay.stdout}`)
  }

  const duplicateContext = await saveMysqlRawEvent({
    requestId: payload.requestId,
    receivedAt: payload.receivedAt,
    headers: { source: 'p1-replay-verification' },
    payload,
    record: payload.record,
    connectorKey: 'caoliao-pingxiang-test',
  })
  const [[verification]] = await pool.execute(
    `SELECT
       e.parse_status,
       COUNT(DISTINCT b.record_id) AS business_record_count,
       COUNT(DISTINCT r.replay_job_id) AS replay_job_count
     FROM webhook_events e
     LEFT JOIN business_records b ON b.raw_event_id = e.event_id
     LEFT JOIN event_replay_jobs r ON r.event_id = e.event_id AND r.status = 'completed'
     WHERE e.event_id = ?
     GROUP BY e.event_id, e.parse_status`,
    [rawContext.rawEvent.eventId],
  )

  if (verification.parse_status !== 'processed') throw new Error('replay-test-not-processed')
  if (Number(verification.business_record_count) !== 1) {
    throw new Error('replay-test-business-record-count-mismatch')
  }
  if (Number(verification.replay_job_count) !== 1) {
    throw new Error('replay-test-job-count-mismatch')
  }
  if (!duplicateContext.rawEvent.duplicate) throw new Error('replay-test-dedup-failed')

  console.log(JSON.stringify({
    success: true,
    eventId: rawContext.rawEvent.eventId,
    parseStatus: verification.parse_status,
    businessRecordCount: Number(verification.business_record_count),
    replayJobCount: Number(verification.replay_job_count),
    duplicateWriteBlocked: true,
  }))
} finally {
  await closeMysqlPool()
}
