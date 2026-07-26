import { randomUUID } from 'node:crypto'
import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'
import {
  findConnector,
  getWebhookEventById,
  standardizeWebhookEvent,
} from '../repositories/mysqlBusinessRepository.js'
import { dispatchBusinessProcess } from '../services/caoliaoBusinessService.js'

const eventId = process.argv.find(value => value.startsWith('--event-id='))?.split('=')[1]
if (!eventId) throw new Error('missing --event-id')

const pool = getMysqlPool()
const event = await getWebhookEventById(eventId)
if (!event) throw new Error('webhook-event-not-found')
if (event.parse_status === 'processed') throw new Error('webhook-event-already-processed')

const replayJobId = randomUUID()
await pool.execute(
  `INSERT INTO event_replay_jobs (replay_job_id, event_id, status, started_at, attempts)
   VALUES (?, ?, 'running', CURRENT_TIMESTAMP(3), 1)`,
  [replayJobId, eventId],
)

try {
  const connector = await findConnector(event.connector_key)
  const payload = typeof event.payload_json === 'string' ? JSON.parse(event.payload_json) : event.payload_json
  const record = payload?.record || await dispatchBusinessProcess(payload)
  const result = await standardizeWebhookEvent({
    eventId,
    connector,
    sourceEventId: event.source_event_id,
    record,
  })
  await pool.execute(
    `UPDATE event_replay_jobs
        SET status = 'completed', finished_at = CURRENT_TIMESTAMP(3), last_error = NULL
      WHERE replay_job_id = ?`,
    [replayJobId],
  )
  console.log(JSON.stringify({ success: true, replayJobId, eventId, result }))
} catch (error) {
  await pool.execute(
    `UPDATE event_replay_jobs
        SET status = 'failed', finished_at = CURRENT_TIMESTAMP(3), last_error = ?
      WHERE replay_job_id = ?`,
    [error.message, replayJobId],
  )
  throw error
} finally {
  await closeMysqlPool()
}
