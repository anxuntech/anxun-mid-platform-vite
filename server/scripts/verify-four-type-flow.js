import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'
import { spawnSync } from 'node:child_process'
import { dispatchBusinessProcess } from '../services/caoliaoBusinessService.js'
import { buildPingxiangMysqlDashboardData } from '../services/govPingxiangMysqlService.js'
import {
  ingestMysqlEvent,
  saveMysqlRawEvent,
} from '../services/mysqlEventIngestService.js'

const keepData = process.argv.includes('--keep')
const connectorKey = process.env.CAOLIAO_CONNECTOR_KEY || 'caoliao-pingxiang-test'
const pool = getMysqlPool()
const [mappingRows] = await pool.execute(
  `SELECT m.source_company_name
     FROM source_company_mappings m
     JOIN source_connectors c ON c.connector_id = m.connector_id
    WHERE c.connector_key = ? AND m.status = 'active'
    ORDER BY m.updated_at DESC
    LIMIT 1`,
  [connectorKey],
)
const enterpriseName = mappingRows[0]?.source_company_name
if (!enterpriseName) throw new Error(`active-company-mapping-not-found:${connectorKey}`)

const runId = `p1-four-types-${Date.now()}`
const submittedAt = new Date().toISOString()
const evidenceUrl = type => `https://evidence.invalid/${runId}/${type}.jpg`
const payloads = [
  {
    formType: 'hazard',
    formNumber: 'VERIFY-H',
    serialNumber: `${runId}-hazard`,
    enterpriseName,
    hazardName: 'P1受控验证隐患',
    hazardLevel: '低风险',
    status: '待整改',
    summary: 'P1受控测试隐患记录',
    fields: [{ name: '现场照片', value: evidenceUrl('hazard') }],
    submittedAt,
  },
  {
    formType: 'serviceRecord',
    formNumber: 'VERIFY-I',
    serialNumber: `${runId}-inspection`,
    enterpriseName,
    serviceType: 'P1受控验证巡检',
    resultSummary: '正常',
    fields: [{ name: '现场照片', value: evidenceUrl('inspection') }],
    submittedAt,
  },
  {
    formType: 'workPermit',
    formNumber: 'VERIFY-W',
    serialNumber: `${runId}-work-permit`,
    enterpriseName,
    permitType: 'P1受控验证动火作业票',
    location: 'P1受控验证区域',
    status: '待审批',
    applicant: 'P1测试人员',
    fields: [{ name: '作业票附件', value: evidenceUrl('work-permit') }],
    submittedAt,
  },
  {
    formType: 'trainingExam',
    formNumber: 'VERIFY-T',
    serialNumber: `${runId}-training`,
    enterpriseName,
    personName: 'P1测试人员',
    courseName: 'P1受控安全培训',
    status: '已完成',
    examResult: '合格',
    score: 100,
    fields: [{ name: '培训签到附件', value: evidenceUrl('training') }],
    submittedAt,
  },
]

const insertedEventIds = []
const insertedRecordIds = []
const duplicateChecks = []
let replayVerified = false

try {
  for (const [index, payload] of payloads.entries()) {
    const record = await dispatchBusinessProcess(payload)
    const input = {
      requestId: `${runId}-${record.formType}`,
      receivedAt: submittedAt,
      headers: { source: 'p1-four-type-verification' },
      payload,
      rawBody: JSON.stringify(payload),
      record,
      connectorKey,
    }
    let result
    if (index === 0) {
      const rawContext = await saveMysqlRawEvent(input)
      insertedEventIds.push(rawContext.rawEvent.eventId)
      const replay = spawnSync(
        process.execPath,
        ['server/scripts/replay-webhook-event.js', `--event-id=${rawContext.rawEvent.eventId}`],
        { cwd: process.cwd(), env: process.env, encoding: 'utf8' },
      )
      if (replay.status !== 0) {
        throw new Error(`verification-replay-failed:${replay.stderr || replay.stdout}`)
      }
      replayVerified = true
      const [replayedRows] = await pool.execute(
        'SELECT record_id FROM business_records WHERE raw_event_id = ?',
        [rawContext.rawEvent.eventId],
      )
      result = {
        status: 'inserted',
        eventId: rawContext.rawEvent.eventId,
        recordId: replayedRows[0]?.record_id,
      }
    } else {
      result = await ingestMysqlEvent(input)
      insertedEventIds.push(result.eventId)
    }
    if (result.status !== 'inserted') {
      throw new Error(`verification-ingest-failed:${record.formType}:${result.status}`)
    }
    if (!result.recordId) throw new Error(`verification-record-id-missing:${record.formType}`)
    insertedRecordIds.push(result.recordId)

    const duplicate = await ingestMysqlEvent(input)
    if (duplicate.status !== 'duplicate') {
      throw new Error(`verification-dedup-failed:${record.formType}:${duplicate.status}`)
    }
    duplicateChecks.push(record.formType)
  }

  const placeholders = insertedEventIds.map(() => '?').join(', ')
  const [rows] = await pool.execute(
    `SELECT b.record_type,
            h.hazard_id IS NOT NULL AS has_hazard,
            i.inspection_id IS NOT NULL AS has_inspection,
            w.work_permit_id IS NOT NULL AS has_work_permit,
            t.training_id IS NOT NULL AS has_training,
            COUNT(DISTINCT a.attachment_id) AS attachment_count,
            e.parse_status,
            e.received_at,
            b.occurred_at,
            TIMESTAMPDIFF(MINUTE, e.received_at, e.created_at) AS offset_minutes
       FROM business_records b
       JOIN webhook_events e ON e.event_id = b.raw_event_id
       LEFT JOIN hazard_records h ON h.record_id = b.record_id
       LEFT JOIN inspection_records i ON i.record_id = b.record_id
       LEFT JOIN work_permit_records w ON w.record_id = b.record_id
       LEFT JOIN training_records t ON t.record_id = b.record_id
       LEFT JOIN record_attachments a ON a.record_id = b.record_id
      WHERE b.raw_event_id IN (${placeholders})
      GROUP BY b.record_id, b.record_type, h.hazard_id, i.inspection_id,
               w.work_permit_id, t.training_id, e.parse_status, e.received_at,
               b.occurred_at, e.created_at
      ORDER BY b.record_type`,
    insertedEventIds,
  )
  const verified = new Set(
    rows.filter(row => (
      (row.record_type === 'hazard' && row.has_hazard) ||
      (row.record_type === 'inspection' && row.has_inspection) ||
      (row.record_type === 'work_permit' && row.has_work_permit) ||
      (row.record_type === 'training' && row.has_training)
    )).map(row => row.record_type),
  )
  const expected = ['hazard', 'inspection', 'work_permit', 'training']
  const missing = expected.filter(type => !verified.has(type))
  if (missing.length) throw new Error(`four-type-verification-missing:${missing.join(',')}`)
  if (rows.some(row => Number(row.attachment_count) !== 1)) {
    throw new Error('four-type-verification-attachment-count-mismatch')
  }
  if (rows.some(row => row.parse_status !== 'processed')) {
    throw new Error('four-type-verification-raw-event-not-processed')
  }
  if (rows.some(row => Math.abs(Number(row.offset_minutes || 0)) > 1)) {
    throw new Error('four-type-verification-time-offset-mismatch')
  }

  const previousEnvironment = process.env.PINGXIANG_SOURCE_ENVIRONMENT
  process.env.PINGXIANG_SOURCE_ENVIRONMENT = 'test'
  const dashboard = await buildPingxiangMysqlDashboardData()
  if (previousEnvironment === undefined) delete process.env.PINGXIANG_SOURCE_ENVIRONMENT
  else process.env.PINGXIANG_SOURCE_ENVIRONMENT = previousEnvironment

  const detailCollections = [
    dashboard.hazard_reports,
    dashboard.patrol_records,
    dashboard.work_permits,
    dashboard.training_exam_records,
  ]
  const visibleRecords = detailCollections
    .flat()
    .filter(item => insertedRecordIds.includes(item.id))
  if (visibleRecords.length !== 4) throw new Error('four-type-verification-dashboard-list-mismatch')
  if (visibleRecords.some(item => !Array.isArray(item.timeline) || item.timeline.length === 0)) {
    throw new Error('four-type-verification-detail-timeline-missing')
  }
  if (visibleRecords.some(item => !Array.isArray(item.evidence_files) || item.evidence_files.length !== 1)) {
    throw new Error('four-type-verification-detail-attachment-missing')
  }

  console.log(JSON.stringify({
    success: true,
    runId,
    connectorKey,
    enterpriseName,
    verifiedTypes: expected,
    rawEventsProcessed: rows.length,
    attachmentsVerified: rows.reduce((sum, row) => sum + Number(row.attachment_count), 0),
    duplicateTypesVerified: duplicateChecks,
    replayVerified,
    aggregateListRecordsVerified: visibleRecords.length,
    detailTimelinesVerified: visibleRecords.length,
    testMarker: runId,
    eventIds: insertedEventIds,
    recordIds: insertedRecordIds,
    retained: keepData,
  }, null, 2))
} finally {
  if (!keepData && insertedEventIds.length) {
    const placeholders = insertedEventIds.map(() => '?').join(', ')
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [recordRows] = await connection.execute(
        `SELECT record_id FROM business_records WHERE raw_event_id IN (${placeholders})`,
        insertedEventIds,
      )
      const recordIds = recordRows.map(row => row.record_id)
      if (recordIds.length) {
        const recordPlaceholders = recordIds.map(() => '?').join(', ')
        for (const table of [
          'record_attachments',
          'hazard_records',
          'inspection_records',
          'work_permit_records',
          'training_records',
        ]) {
          await connection.execute(
            `DELETE FROM ${table} WHERE record_id IN (${recordPlaceholders})`,
            recordIds,
          )
        }
        await connection.execute(
          `DELETE FROM business_records WHERE record_id IN (${recordPlaceholders})`,
          recordIds,
        )
      }
      await connection.execute(
        `DELETE FROM data_quality_issues WHERE event_id IN (${placeholders})`,
        insertedEventIds,
      )
      await connection.execute(
        `DELETE FROM event_replay_jobs WHERE event_id IN (${placeholders})`,
        insertedEventIds,
      )
      await connection.execute(
        `DELETE FROM webhook_events WHERE event_id IN (${placeholders})`,
        insertedEventIds,
      )
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
  await closeMysqlPool()
}
