import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'
import { normalizeCompanyKey } from '../services/eventIdentity.js'
import { buildPingxiangPresentationSeed } from '../seeds/pingxiangPresentationData.js'

const apply = process.argv.includes('--apply')
const seed = buildPingxiangPresentationSeed()
const counts = seed.records.reduce((result, record) => {
  result[record.kind] = (result[record.kind] || 0) + 1
  return result
}, {})

if (!apply) {
  console.log(JSON.stringify({
    success: true,
    dryRun: true,
    environment: 'test',
    companies: seed.companies.length,
    records: seed.records.length,
    counts,
    next: '确认后使用 --apply，并设置 CONFIRM_PINGXIANG_TEST_RESET=YES',
  }, null, 2))
  process.exit(0)
}

if (process.env.CONFIRM_PINGXIANG_TEST_RESET !== 'YES') {
  throw new Error('必须设置 CONFIRM_PINGXIANG_TEST_RESET=YES 才能重建平乡 test 数据')
}

const pool = getMysqlPool()
const connection = await pool.getConnection()
const placeholders = values => values.map(() => '?').join(',')
const backupDir = path.resolve(
  process.env.PINGXIANG_TEST_BACKUP_DIR || '.backups/pingxiang-test',
)

const selectBackup = async () => {
  const [records] = await connection.execute(
    `SELECT * FROM business_records
      WHERE project_id = 'pingxiang' AND source_environment = 'test'
      ORDER BY occurred_at, record_id`,
  )
  const recordIds = records.map(item => item.record_id)
  const eventIds = [...new Set(records.map(item => item.raw_event_id).filter(Boolean))]
  const child = async table => recordIds.length
    ? (await connection.execute(
        `SELECT * FROM ${table} WHERE record_id IN (${placeholders(recordIds)})`,
        recordIds,
      ))[0]
    : []
  const attachments = await child('record_attachments')
  const hazards = await child('hazard_records')
  const inspections = await child('inspection_records')
  const permits = await child('work_permit_records')
  const trainings = await child('training_records')
  const [events] = eventIds.length
    ? await connection.execute(
        `SELECT * FROM webhook_events WHERE event_id IN (${placeholders(eventIds)})`,
        eventIds,
      )
    : [[]]
  return { exportedAt: new Date().toISOString(), environment: 'test', records, attachments, hazards, inspections, permits, trainings, events }
}

const deleteCurrentTestData = async () => {
  const [rows] = await connection.execute(
    `SELECT record_id, raw_event_id FROM business_records
      WHERE project_id = 'pingxiang' AND source_environment = 'test'`,
  )
  const recordIds = rows.map(item => item.record_id)
  const eventIds = [...new Set(rows.map(item => item.raw_event_id).filter(Boolean))]
  if (recordIds.length) {
    for (const table of ['record_attachments', 'hazard_records', 'inspection_records', 'work_permit_records', 'training_records']) {
      await connection.execute(
        `DELETE FROM ${table} WHERE record_id IN (${placeholders(recordIds)})`,
        recordIds,
      )
    }
    await connection.execute(
      `DELETE FROM business_records WHERE record_id IN (${placeholders(recordIds)})`,
      recordIds,
    )
  }
  if (eventIds.length) {
    await connection.execute(
      `DELETE FROM event_replay_jobs WHERE event_id IN (${placeholders(eventIds)})`,
      eventIds,
    )
    await connection.execute(
      `DELETE FROM data_quality_issues WHERE event_id IN (${placeholders(eventIds)})`,
      eventIds,
    )
    await connection.execute(
      `DELETE FROM webhook_events WHERE event_id IN (${placeholders(eventIds)})`,
      eventIds,
    )
  }
  return { records: recordIds.length, events: eventIds.length }
}

const insertRecord = async record => {
  const recordId = `px-test-${record.kind}-${String(record.sequence).padStart(4, '0')}`
  const eventId = `px-test-event-${record.kind}-${String(record.sequence).padStart(4, '0')}`
  const requestId = `presentation-${record.sourceRecordId}`
  const detail = { ...record.detail }
  if (record.kind === 'hazard' && detail.linked_patrol_source_id) {
    const linked = seed.records.find(item =>
      item.kind === 'inspection' && item.sourceRecordId === detail.linked_patrol_source_id)
    detail.linked_patrol_id = linked
      ? `px-test-inspection-${String(linked.sequence).padStart(4, '0')}`
      : ''
    delete detail.linked_patrol_source_id
  }
  const payload = {
    source: 'anxun-presentation-test',
    seed_version: '2026-07-28',
    source_record_id: record.sourceRecordId,
    detail,
  }
  await connection.execute(
    `INSERT INTO webhook_events (
       event_id, connector_id, source_system, source_environment, source_event_id,
       request_id, received_at, payload_json, raw_body, parse_error,
       payload_hash, headers_json, parse_status, processed_at
     ) VALUES (?, 'connector-caoliao-pingxiang-test', 'anxun_test_seed', 'test', ?,
       ?, ?, ?, '', '', ?, '{}', 'processed', ?)`,
    [
      eventId,
      record.sourceRecordId,
      requestId,
      record.occurredAt,
      JSON.stringify(payload),
      createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      record.occurredAt,
    ],
  )
  await connection.execute(
    `INSERT INTO business_records (
       record_id, county_id, project_id, company_id, record_type, source_system,
       source_environment, source_record_id, source_event_id, business_status,
       title, summary, occurred_at, raw_event_id
     ) VALUES (?, 'county-pingxiang', 'pingxiang', ?, ?, 'anxun_test_seed',
       'test', ?, ?, ?, ?, ?, ?, ?)`,
    [
      recordId, record.company.companyId, record.kind, record.sourceRecordId,
      record.sourceRecordId, record.status, record.title, record.summary,
      record.occurredAt, eventId,
    ],
  )

  if (record.kind === 'hazard') {
    await connection.execute(
      `INSERT INTO hazard_records (
         hazard_id, record_id, description, hazard_level, reporter_name, reported_at,
         assignee_name, rectification_deadline, rectified_at, closed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${recordId}-detail`, recordId, record.specialized.description,
        record.specialized.level, record.specialized.reporter, record.occurredAt,
        record.specialized.assignee, record.specialized.deadline,
        record.specialized.rectifiedAt, record.specialized.closedAt,
      ],
    )
  }
  if (record.kind === 'inspection') {
    const linked = seed.records.find(item =>
      item.kind === 'hazard' && item.sourceRecordId === record.specialized.linkedHazardSourceId)
    const linkedRecordId = linked ? `px-test-hazard-${String(linked.sequence).padStart(4, '0')}` : null
    await connection.execute(
      `INSERT INTO inspection_records (
         inspection_id, record_id, inspection_type, point_name, inspector_name,
         inspected_at, item_count, abnormal_count, result, linked_hazard_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${recordId}-detail`, recordId, record.specialized.inspectionType,
        record.specialized.pointName, record.specialized.inspector, record.occurredAt,
        record.specialized.itemCount, record.specialized.abnormalCount,
        record.specialized.result, linkedRecordId,
      ],
    )
  }
  if (record.kind === 'work_permit') {
    await connection.execute(
      `INSERT INTO work_permit_records (
         work_permit_id, record_id, permit_type, applicant_name, location,
         planned_start, planned_end, guardian_name, completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${recordId}-detail`, recordId, record.specialized.permitType,
        record.specialized.applicant, record.specialized.location,
        record.specialized.plannedStart, record.specialized.plannedEnd,
        record.specialized.guardian, record.specialized.completedAt,
      ],
    )
  }
  if (record.kind === 'training') {
    await connection.execute(
      `INSERT INTO training_records (
         training_id, record_id, title, participant_name, training_method,
         started_at, ended_at, exam_score, passed
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${recordId}-detail`, recordId, record.title,
        record.specialized.participantName, record.specialized.method,
        record.specialized.startedAt, record.specialized.endedAt,
        record.specialized.score, record.specialized.passed ? 1 : 0,
      ],
    )
  }
  for (const attachment of record.attachments) {
    await connection.execute(
      `INSERT INTO record_attachments (
         attachment_id, record_id, file_name, file_url, content_type
       ) VALUES (?, ?, ?, ?, ?)`,
      [attachment.id, recordId, attachment.name, attachment.url, attachment.contentType],
    )
  }
}

try {
  await mkdir(backupDir, { recursive: true })
  const backup = await selectBackup()
  const backupPath = path.join(backupDir, `pingxiang-test-before-presentation-${Date.now()}.json`)
  await writeFile(
    backupPath,
    JSON.stringify(backup, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2),
    { mode: 0o600 },
  )

  await connection.beginTransaction()
  await connection.execute(
    `INSERT INTO counties (county_id, county_slug, county_name)
     VALUES ('county-pingxiang', 'pingxiang', '平乡县')
     ON DUPLICATE KEY UPDATE county_name = VALUES(county_name), status = 'active'`,
  )
  await connection.execute(
    `INSERT INTO projects (project_id, county_id, project_slug, project_name)
     VALUES ('pingxiang', 'county-pingxiang', 'pingxiang', '平乡县企业现场安全管理四项闭环试点')
     ON DUPLICATE KEY UPDATE project_name = VALUES(project_name), status = 'active'`,
  )
  await connection.execute(
    `INSERT INTO source_connectors (
       connector_id, connector_key, source_system, source_environment, project_id, enabled
     ) VALUES ('connector-caoliao-pingxiang-test', 'caoliao-pingxiang-test',
       'caoliao', 'test', 'pingxiang', 1)
     ON DUPLICATE KEY UPDATE project_id = 'pingxiang', enabled = 1`,
  )
  const removed = await deleteCurrentTestData()
  for (const company of seed.companies) {
    await connection.execute(
      `INSERT INTO companies (
         company_id, project_id, company_name, industry, address,
         contact_name, contact_phone, status, enabled_at
       ) VALUES (?, 'pingxiang', ?, ?, ?, ?, ?, 'active', ?)
       ON DUPLICATE KEY UPDATE company_name = VALUES(company_name),
         industry = VALUES(industry), address = VALUES(address),
         contact_name = VALUES(contact_name), contact_phone = VALUES(contact_phone),
         status = 'active', enabled_at = VALUES(enabled_at)`,
      [
        company.companyId, company.companyName, company.industry, company.address,
        company.contactName, company.contactPhone, company.enabledAt,
      ],
    )
    await connection.execute(
      `INSERT INTO source_company_mappings (
         mapping_id, connector_id, company_id, source_company_key,
         source_company_name, source_company_name_normalized
       ) VALUES (?, 'connector-caoliao-pingxiang-test', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE company_id = VALUES(company_id),
         source_company_name = VALUES(source_company_name),
         source_company_name_normalized = VALUES(source_company_name_normalized),
         status = 'active'`,
      [
        `px-test-map-${String(seed.companies.indexOf(company) + 1).padStart(3, '0')}`,
        company.companyId, normalizeCompanyKey(company.companyName),
        company.companyName, normalizeCompanyKey(company.companyName),
      ],
    )
  }
  for (const record of seed.records) await insertRecord(record)
  await connection.commit()
  console.log(JSON.stringify({
    success: true,
    environment: 'test',
    backupPath,
    removed,
    companies: seed.companies.length,
    records: seed.records.length,
    counts,
  }, null, 2))
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release()
  await closeMysqlPool()
}
