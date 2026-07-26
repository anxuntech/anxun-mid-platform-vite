import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const environmentArg = args.find(value => value.startsWith('--environment='))
const environment = String(environmentArg?.split('=')[1] || 'test').toLowerCase()

if (!['test', 'real'].includes(environment)) {
  throw new Error('invalid-environment:expected test or real')
}
if (apply && process.env.ALLOW_TIME_REPAIR !== 'true') {
  throw new Error('time-repair-disabled:set ALLOW_TIME_REPAIR=true after reviewing dry-run output')
}
if (apply && !process.env.TIME_REPAIR_BACKUP_ID) {
  throw new Error('time-repair-backup-id-required')
}

const pool = getMysqlPool()
const connection = await pool.getConnection()
const eventCondition = `
  e.source_environment = ?
  AND TIMESTAMPDIFF(MINUTE, e.received_at, e.created_at) BETWEEN 475 AND 485
`

const countCandidates = async () => {
  const [[eventRow]] = await connection.execute(
    `SELECT COUNT(*) AS event_count,
            MIN(e.received_at) AS earliest_received_at,
            MAX(e.received_at) AS latest_received_at
       FROM webhook_events e
      WHERE ${eventCondition}`,
    [environment],
  )
  const [[businessRow]] = await connection.execute(
    `SELECT COUNT(*) AS business_count
       FROM business_records b
       JOIN webhook_events e ON e.event_id = b.raw_event_id
      WHERE ${eventCondition}`,
    [environment],
  )
  return {
    eventCount: Number(eventRow.event_count || 0),
    businessCount: Number(businessRow.business_count || 0),
    earliestReceivedAt: eventRow.earliest_received_at || null,
    latestReceivedAt: eventRow.latest_received_at || null,
  }
}

const updateSpecialized = async (table, timeColumns) => {
  const assignments = timeColumns
    .map(column => `${column} = CASE WHEN ${column} IS NULL THEN NULL ELSE DATE_ADD(${column}, INTERVAL 8 HOUR) END`)
    .join(', ')
  await connection.execute(
    `UPDATE ${table} s
       JOIN business_records b ON b.record_id = s.record_id
       JOIN webhook_events e ON e.event_id = b.raw_event_id
        SET ${assignments}
      WHERE ${eventCondition}`,
    [environment],
  )
}

try {
  const before = await countCandidates()
  if (!apply || before.eventCount === 0) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      environment,
      offsetHours: 8,
      backupIdRequiredForApply: true,
      candidates: before,
    }, null, 2))
  } else {
    await connection.beginTransaction()
    try {
      await updateSpecialized('hazard_records', [
        'reported_at',
        'rectification_deadline',
        'rectified_at',
        'closed_at',
      ])
      await updateSpecialized('inspection_records', ['inspected_at'])
      await updateSpecialized('work_permit_records', [
        'planned_start',
        'planned_end',
        'completed_at',
      ])
      await updateSpecialized('training_records', ['started_at', 'ended_at'])
      await connection.execute(
        `UPDATE business_records b
           JOIN webhook_events e ON e.event_id = b.raw_event_id
            SET b.occurred_at = DATE_ADD(b.occurred_at, INTERVAL 8 HOUR)
          WHERE ${eventCondition}`,
        [environment],
      )
      await connection.execute(
        `UPDATE webhook_events e
            SET e.received_at = DATE_ADD(e.received_at, INTERVAL 8 HOUR),
                e.processed_at = CASE
                  WHEN e.processed_at IS NULL THEN NULL
                  ELSE DATE_ADD(e.processed_at, INTERVAL 8 HOUR)
                END
          WHERE ${eventCondition}`,
        [environment],
      )
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    }
    const after = await countCandidates()
    console.log(JSON.stringify({
      mode: 'applied',
      environment,
      offsetHours: 8,
      backupId: process.env.TIME_REPAIR_BACKUP_ID,
      corrected: before,
      remainingCandidates: after,
    }, null, 2))
  }
} finally {
  connection.release()
  await closeMysqlPool()
}
