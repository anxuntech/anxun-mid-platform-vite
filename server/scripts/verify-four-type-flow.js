import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'
import { dispatchBusinessProcess } from '../services/caoliaoBusinessService.js'
import { ingestMysqlEvent } from '../services/mysqlEventIngestService.js'

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
const payloads = [
  {
    formType: 'hazard',
    formNumber: 'VERIFY-H',
    serialNumber: `${runId}-hazard`,
    enterpriseName,
    hazardName: '四类链路验证隐患',
    hazardLevel: '低',
    status: '待整改',
    submittedAt: new Date().toISOString(),
  },
  {
    formType: 'serviceRecord',
    formNumber: 'VERIFY-I',
    serialNumber: `${runId}-inspection`,
    enterpriseName,
    serviceType: '四类链路验证巡检',
    resultSummary: '正常',
    submittedAt: new Date().toISOString(),
  },
  {
    formType: 'workPermit',
    formNumber: 'VERIFY-W',
    serialNumber: `${runId}-work-permit`,
    enterpriseName,
    permitType: '动火作业票',
    location: '验证区域',
    status: '待审批',
    applicant: '链路验证人员',
    submittedAt: new Date().toISOString(),
  },
  {
    formType: 'trainingExam',
    formNumber: 'VERIFY-T',
    serialNumber: `${runId}-training`,
    enterpriseName,
    personName: '链路验证人员',
    courseName: '安全培训链路验证',
    status: '已完成',
    examResult: '合格',
    score: 100,
    submittedAt: new Date().toISOString(),
  },
]

const insertedEventIds = []

try {
  for (const payload of payloads) {
    const record = await dispatchBusinessProcess(payload)
    const result = await ingestMysqlEvent({
      requestId: `${runId}-${record.formType}`,
      receivedAt: new Date().toISOString(),
      headers: { source: 'p1-four-type-verification' },
      payload,
      rawBody: JSON.stringify(payload),
      record,
      connectorKey,
    })
    if (result.status !== 'inserted') {
      throw new Error(`verification-ingest-failed:${record.formType}:${result.status}`)
    }
    insertedEventIds.push(result.eventId)
  }

  const placeholders = insertedEventIds.map(() => '?').join(', ')
  const [rows] = await pool.execute(
    `SELECT b.record_type,
            h.hazard_id IS NOT NULL AS has_hazard,
            i.inspection_id IS NOT NULL AS has_inspection,
            w.work_permit_id IS NOT NULL AS has_work_permit,
            t.training_id IS NOT NULL AS has_training
       FROM business_records b
       LEFT JOIN hazard_records h ON h.record_id = b.record_id
       LEFT JOIN inspection_records i ON i.record_id = b.record_id
       LEFT JOIN work_permit_records w ON w.record_id = b.record_id
       LEFT JOIN training_records t ON t.record_id = b.record_id
      WHERE b.raw_event_id IN (${placeholders})
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

  console.log(JSON.stringify({
    success: true,
    runId,
    connectorKey,
    enterpriseName,
    verifiedTypes: expected,
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
