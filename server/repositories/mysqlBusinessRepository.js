import { randomUUID } from 'node:crypto'
import { getMysqlPool } from '../db/mysql.js'
import { normalizeCompanyKey } from '../services/eventIdentity.js'
import { toMysqlDateTime } from '../utils/businessTime.js'

export { toMysqlDateTime } from '../utils/businessTime.js'

const jsonValue = value => JSON.stringify(value ?? null)

export const findConnector = async (connectorKey, connection = getMysqlPool()) => {
  const [rows] = await connection.execute(
    `SELECT connector_id, connector_key, source_system, source_environment, project_id, enabled
       FROM source_connectors
      WHERE connector_key = ?`,
    [connectorKey],
  )
  return rows[0] || null
}

export const saveRawWebhookEvent = async ({
  connector,
  sourceEventId,
  requestId,
  receivedAt,
  payload,
  rawBody = '',
  parseError = '',
  payloadHash,
  headers,
}) => {
  const pool = getMysqlPool()
  const eventId = randomUUID()
  try {
    await pool.execute(
      `INSERT INTO webhook_events (
         event_id, connector_id, source_system, source_environment, source_event_id,
         request_id, received_at, payload_json, raw_body, parse_error,
         payload_hash, headers_json, parse_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received')`,
      [
        eventId,
        connector.connector_id,
        connector.source_system,
        connector.source_environment,
        sourceEventId,
        requestId,
        toMysqlDateTime(receivedAt),
        jsonValue(payload),
        rawBody,
        parseError,
        payloadHash,
        jsonValue(headers),
      ],
    )
    return { eventId, duplicate: false }
  } catch (error) {
    if (error?.code !== 'ER_DUP_ENTRY') throw error
  }

  const [rows] = await pool.execute(
    `SELECT event_id, parse_status
       FROM webhook_events
      WHERE connector_id = ? AND source_event_id = ?`,
    [connector.connector_id, sourceEventId],
  )
  if (!rows.length) throw new Error('duplicate-event-not-found')
  return { eventId: rows[0].event_id, duplicate: true, parseStatus: rows[0].parse_status }
}

const findCompany = async (connection, connectorId, record) => {
  const enterpriseName = record.enterpriseName
  const normalizedName = normalizeCompanyKey(enterpriseName)
  const sourceCompanyKey = normalizeCompanyKey(record.sourceCompanyKey)
  const formNumber = String(record.formNumber || '').trim()
  const partitionId = String(record.partitionId || '').trim()
  if (!normalizedName && !sourceCompanyKey && !formNumber && !partitionId) return null
  const [rows] = await connection.execute(
    `SELECT c.company_id, c.project_id, p.county_id
       FROM source_company_mappings m
       JOIN companies c ON c.company_id = m.company_id
       JOIN projects p ON p.project_id = c.project_id
      WHERE m.connector_id = ?
        AND m.status = 'active'
        AND (? = '' OR c.project_id = ?)
        AND (
          (? <> '' AND m.source_company_key = ?)
          OR (? <> '' AND m.partition_id = ?)
          OR (? <> '' AND m.form_number = ? AND m.source_company_name_normalized = ?)
          OR (? <> '' AND m.source_company_name_normalized = ?)
        )
      ORDER BY
        (m.source_company_key = ? AND ? <> '') DESC,
        (m.partition_id = ? AND ? <> '') DESC,
        (m.form_number = ? AND ? <> '') DESC,
        (m.source_company_name_normalized = ? AND ? <> '') DESC,
        m.updated_at DESC
      LIMIT 1`,
    [
      connectorId,
      record.projectId || '', record.projectId || '',
      sourceCompanyKey, sourceCompanyKey,
      partitionId, partitionId,
      formNumber, formNumber, normalizedName,
      normalizedName, normalizedName,
      sourceCompanyKey, sourceCompanyKey,
      partitionId, partitionId,
      formNumber, formNumber,
      normalizedName, normalizedName,
    ],
  )
  return rows[0] || null
}

const recordTypeFor = formType => ({
  hazard: 'hazard',
  serviceRecord: 'inspection',
  workPermit: 'work_permit',
  trainingExam: 'training',
})[formType] || ''

const recordStatusFor = record =>
  record.status ||
  record.recordStatus ||
  record.permitStatus ||
  record.trainingStatus ||
  ''

const titleFor = record =>
  record.hazardName ||
  record.serviceType ||
  record.permitType ||
  record.courseName ||
  record.formName ||
  ''

const summaryFor = record => record.summary || record.resultSummary || ''

const insertSpecializedRecord = async (connection, recordId, record, occurredAt) => {
  if (record.formType === 'hazard') {
    await connection.execute(
      `INSERT INTO hazard_records (
         hazard_id, record_id, description, hazard_level, reporter_name, reported_at,
         assignee_name, rectification_deadline
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(), recordId, summaryFor(record), record.hazardLevel || '',
        record.executor || '', occurredAt, record.responsiblePerson || '',
        record.rectificationDeadline ? toMysqlDateTime(record.rectificationDeadline) : null,
      ],
    )
    await connection.execute(
      `UPDATE hazard_records
          SET rectified_at = ?, closed_at = ?
        WHERE record_id = ?`,
      [
        record.rectifiedAt ? toMysqlDateTime(record.rectifiedAt) : null,
        record.closedAt ? toMysqlDateTime(record.closedAt) : null,
        recordId,
      ],
    )
  }

  if (record.formType === 'serviceRecord') {
    const abnormal = /异常|不正常|不合格|隐患|问题/.test(summaryFor(record)) ? 1 : 0
    await connection.execute(
      `INSERT INTO inspection_records (
         inspection_id, record_id, inspection_type, point_name, inspector_name,
         inspected_at, item_count, abnormal_count, result
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(), recordId, record.serviceType || '', record.formName || '',
        record.executor || '', occurredAt, Array.isArray(record.rawFields) ? record.rawFields.length : 0,
        abnormal, record.resultSummary || '',
      ],
    )
  }

  if (record.formType === 'workPermit') {
    await connection.execute(
      `INSERT INTO work_permit_records (
         work_permit_id, record_id, permit_type, applicant_name, location,
         planned_start, planned_end, guardian_name, completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(), recordId, record.permitType || '', record.applicant || '',
        record.location || '',
        record.plannedStart ? toMysqlDateTime(record.plannedStart) : null,
        record.plannedEnd ? toMysqlDateTime(record.plannedEnd) : null,
        record.guardian || '',
        record.completedAt ? toMysqlDateTime(record.completedAt) : null,
      ],
    )
  }

  if (record.formType === 'trainingExam') {
    const score = Number.isFinite(Number(record.score)) ? Number(record.score) : null
    const passed = /不合格|未通过/.test(record.examResult || '') ? 0 : 1
    await connection.execute(
      `INSERT INTO training_records (
         training_id, record_id, title, participant_name, training_method,
         started_at, ended_at, exam_score, passed
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(), recordId, record.courseName || record.formName || '',
        record.personName || record.executor || '', record.trainingMethod || '',
        record.startedAt ? toMysqlDateTime(record.startedAt) : null,
        record.endedAt ? toMysqlDateTime(record.endedAt) : occurredAt,
        score, passed,
      ],
    )
  }
}

const insertAttachments = async (connection, recordId, attachments) => {
  for (const attachment of Array.isArray(attachments) ? attachments : []) {
    if (!attachment?.url) continue
    await connection.execute(
      `INSERT INTO record_attachments (
         attachment_id, record_id, file_name, file_url, content_type
       ) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), recordId, attachment.title || '', attachment.url, attachment.contentType || ''],
    )
  }
}

export const addDataQualityIssue = async ({
  connection = getMysqlPool(),
  eventId,
  issueType,
  enterpriseName = '',
  detail = {},
}) => {
  await connection.execute(
    `INSERT INTO data_quality_issues (
       issue_id, event_id, issue_type, source_company_key, source_company_name, detail_json
     ) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       source_company_key = VALUES(source_company_key),
       source_company_name = VALUES(source_company_name),
       detail_json = VALUES(detail_json),
       status = 'open',
       resolved_at = NULL`,
    [randomUUID(), eventId, issueType, normalizeCompanyKey(enterpriseName), enterpriseName, jsonValue(detail)],
  )
}

export const standardizeWebhookEvent = async ({ eventId, connector, sourceEventId, record }) => {
  const pool = getMysqlPool()
  const connection = await pool.getConnection()
  const recordType = recordTypeFor(record.formType)

  try {
    await connection.beginTransaction()
    const [existingRecords] = await connection.execute(
      `SELECT record_id, company_id
         FROM business_records
        WHERE raw_event_id = ?
        LIMIT 1`,
      [eventId],
    )
    if (existingRecords.length) {
      await connection.execute(
        `UPDATE data_quality_issues
            SET status = 'resolved', resolved_company_id = ?, resolved_at = CURRENT_TIMESTAMP(3)
          WHERE event_id = ? AND status = 'open'`,
        [existingRecords[0].company_id, eventId],
      )
      await connection.execute(
        `UPDATE webhook_events
            SET parse_status = 'processed', error_message = NULL,
                processed_at = COALESCE(processed_at, CURRENT_TIMESTAMP(3))
          WHERE event_id = ?`,
        [eventId],
      )
      await connection.commit()
      return { status: 'recovered', recordId: existingRecords[0].record_id }
    }

    if (!record.recognized || !recordType) {
      await addDataQualityIssue({
        connection,
        eventId,
        issueType: 'unsupported-record-type',
        enterpriseName: record.enterpriseName,
        detail: { formType: record.formType, formNumber: record.formNumber },
      })
      await connection.execute(
        `UPDATE webhook_events
            SET parse_status = 'isolated', error_message = ?, processed_at = CURRENT_TIMESTAMP(3)
          WHERE event_id = ?`,
        ['unsupported-record-type', eventId],
      )
      await connection.commit()
      return { status: 'isolated', reason: 'unsupported-record-type' }
    }

    const company = await findCompany(connection, connector.connector_id, {
      ...record,
      projectId: connector.project_id || '',
    })
    if (!company) {
      await addDataQualityIssue({
        connection,
        eventId,
        issueType: 'company-unmatched',
        enterpriseName: record.enterpriseName,
        detail: { formNumber: record.formNumber, formName: record.formName },
      })
      await connection.execute(
        `UPDATE webhook_events
            SET parse_status = 'isolated', error_message = ?, processed_at = CURRENT_TIMESTAMP(3)
          WHERE event_id = ?`,
        ['company-unmatched', eventId],
      )
      await connection.commit()
      return { status: 'unmatched', reason: 'company-unmatched' }
    }

    const recordId = randomUUID()
    const occurredAt = toMysqlDateTime(record.submittedAt)
    const sourceRecordId = record.serialNumber || sourceEventId
    await connection.execute(
      `INSERT INTO business_records (
         record_id, county_id, project_id, company_id, record_type, source_system,
         source_environment, source_record_id, source_event_id, business_status,
         title, summary, occurred_at, raw_event_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, company.county_id, company.project_id, company.company_id, recordType,
        connector.source_system, connector.source_environment, sourceRecordId, sourceEventId,
        recordStatusFor(record), titleFor(record), summaryFor(record), occurredAt, eventId,
      ],
    )
    await insertSpecializedRecord(connection, recordId, record, occurredAt)
    await insertAttachments(connection, recordId, record.evidenceFiles)
    await connection.execute(
      `UPDATE data_quality_issues
          SET status = 'resolved', resolved_company_id = ?, resolved_at = CURRENT_TIMESTAMP(3)
        WHERE event_id = ? AND status = 'open'`,
      [company.company_id, eventId],
    )
    await connection.execute(
      `UPDATE webhook_events
          SET parse_status = 'processed', error_message = NULL, processed_at = CURRENT_TIMESTAMP(3)
        WHERE event_id = ?`,
      [eventId],
    )
    await connection.commit()
    return { status: 'inserted', recordId }
  } catch (error) {
    await connection.rollback()
    await pool.execute(
      `UPDATE webhook_events
          SET parse_status = 'failed', error_message = ?, processed_at = CURRENT_TIMESTAMP(3)
        WHERE event_id = ?`,
      [String(error.message || error).slice(0, 4_000), eventId],
    )
    throw error
  } finally {
    connection.release()
  }
}

export const createImportBatch = async ({ sourceFile, checksum, totalRows }) => {
  const batchId = randomUUID()
  await getMysqlPool().execute(
    `INSERT INTO data_import_batches (
       batch_id, source_file, source_environment, source_checksum, started_at, total_rows
     ) VALUES (?, ?, 'test', ?, CURRENT_TIMESTAMP(3), ?)`,
    [batchId, sourceFile, checksum, totalRows],
  )
  return batchId
}

export const finishImportBatch = async (batchId, summary, status = 'completed') => {
  await getMysqlPool().execute(
    `UPDATE data_import_batches
        SET finished_at = CURRENT_TIMESTAMP(3), inserted_rows = ?, duplicate_rows = ?,
            failed_rows = ?, unmatched_rows = ?, status = ?, summary_json = ?
      WHERE batch_id = ?`,
    [
      summary.inserted, summary.duplicates, summary.failed, summary.unmatched,
      status, jsonValue(summary), batchId,
    ],
  )
}

export const addMigrationLog = async ({ batchId, lineNumber, sourceEventId, status, message }) => {
  await getMysqlPool().execute(
    `INSERT INTO migration_logs (
       migration_log_id, batch_id, source_line, source_event_id, result_status, message
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), batchId, lineNumber, sourceEventId || '', status, message || ''],
  )
}

export const getWebhookEventById = async eventId => {
  const [rows] = await getMysqlPool().execute(
    `SELECT e.*, c.connector_key
       FROM webhook_events e
       JOIN source_connectors c ON c.connector_id = e.connector_id
      WHERE e.event_id = ?`,
    [eventId],
  )
  return rows[0] || null
}

export const markWebhookEventFailed = async (eventId, error) => {
  await getMysqlPool().execute(
    `UPDATE webhook_events
        SET parse_status = 'failed', error_message = ?, processed_at = CURRENT_TIMESTAMP(3)
      WHERE event_id = ?`,
    [String(error?.message || error).slice(0, 4_000), eventId],
  )
}
