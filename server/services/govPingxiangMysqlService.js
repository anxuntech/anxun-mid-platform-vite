import { getMysqlPool } from '../db/mysql.js'

const sourceEnvironment = requestedEnvironment => {
  const value = String(
    requestedEnvironment || process.env.PINGXIANG_SOURCE_ENVIRONMENT || 'real',
  ).toLowerCase()
  return ['test', 'real'].includes(value) ? value : 'real'
}

const mapAttachment = row => ({
  id: row.attachment_id,
  name: row.file_name || '现场附件',
  url: row.file_url,
  content_type: row.content_type || '',
  kind: /整改/.test(row.file_name || '') ? '整改照片' : '现场照片',
})

const mapTimelineNode = (id, title, person, time, note, status = 'done') => ({
  id,
  title,
  person: person || '现场提交人',
  time: time || '',
  note: note || '',
  status,
})

const mapRecord = (row, attachmentsByRecord) => ({
  id: row.record_id,
  project_id: row.project_id,
  company_id: row.company_id,
  company_name: row.company_name,
  feature_type: row.record_type,
  title: row.title,
  status: row.business_status,
  submitter: row.actor_name || '',
  submitted_at: row.occurred_at,
  source: row.source_system,
  source_environment: row.source_environment,
  evidence_files: attachmentsByRecord.get(row.record_id) || [],
  demo_data: false,
})

const attachmentMapFor = rows => {
  const result = new Map()
  for (const row of rows) {
    const current = result.get(row.record_id) || []
    current.push(mapAttachment(row))
    result.set(row.record_id, current)
  }
  return result
}

export const buildPingxiangMysqlDashboardData = async ({
  projectId = 'pingxiang',
  requestedEnvironment,
} = {}) => {
  const pool = getMysqlPool()
  const environment = sourceEnvironment(requestedEnvironment)
  const [projectRows] = await pool.execute(
    `SELECT p.project_id, p.project_name, p.project_slug,
            c.county_id, c.county_name, c.county_slug
       FROM projects p
       JOIN counties c ON c.county_id = p.county_id
      WHERE p.project_id = ?
        AND p.status = 'active'
        AND c.status = 'active'
      LIMIT 1`,
    [projectId],
  )
  const project = projectRows[0]
  if (!project) throw new Error('project-not-found')
  const [companies] = await pool.execute(
    `SELECT DISTINCT
            c.company_id, c.company_name, c.project_id, c.industry, c.address,
            c.contact_name, c.contact_phone, c.status, c.enabled_at
       FROM companies c
       JOIN source_company_mappings m ON m.company_id = c.company_id AND m.status = 'active'
       JOIN source_connectors sc ON sc.connector_id = m.connector_id
      WHERE c.project_id = ?
        AND c.status = 'active'
        AND sc.enabled = 1
        AND sc.source_environment = ?
      ORDER BY c.company_name`,
    [projectId, environment],
  )
  const [records] = await pool.execute(
    `SELECT b.*, c.company_name,
            COALESCE(h.reporter_name, i.inspector_name, w.applicant_name, t.participant_name, '') AS actor_name,
            h.description AS hazard_description, h.hazard_level, h.reporter_name,
            h.reported_at, h.assignee_name, h.rectification_deadline,
            h.rectified_at, h.closed_at,
            i.inspection_type, i.point_name, i.inspector_name, i.inspected_at,
            i.item_count, i.result AS inspection_result, i.abnormal_count, i.linked_hazard_id,
            w.permit_type, w.location, w.applicant_name, w.planned_start, w.planned_end,
            w.guardian_name, w.completed_at AS permit_completed_at,
            t.title AS training_title, t.participant_name, t.training_method,
            t.started_at AS training_started_at, t.ended_at AS training_ended_at,
            t.exam_score, t.passed
       FROM business_records b
       JOIN companies c ON c.company_id = b.company_id
       LEFT JOIN hazard_records h ON h.record_id = b.record_id
       LEFT JOIN inspection_records i ON i.record_id = b.record_id
       LEFT JOIN work_permit_records w ON w.record_id = b.record_id
       LEFT JOIN training_records t ON t.record_id = b.record_id
      WHERE b.project_id = ? AND b.source_environment = ?
      ORDER BY b.occurred_at DESC`,
    [projectId, environment],
  )
  const [attachmentRows] = await pool.execute(
    `SELECT a.*
       FROM record_attachments a
       JOIN business_records b ON b.record_id = a.record_id
      WHERE b.project_id = ? AND b.source_environment = ?
      ORDER BY a.collected_at, a.attachment_id`,
    [projectId, environment],
  )
  const [qualityRows] = await pool.execute(
    `SELECT COUNT(*) AS issue_count
       FROM data_quality_issues q
       JOIN webhook_events e ON e.event_id = q.event_id
       JOIN source_connectors sc ON sc.connector_id = e.connector_id
      WHERE e.source_environment = ?
        AND q.status = 'open'
        AND sc.project_id = ?`,
    [environment, projectId],
  )

  const attachmentsByRecord = attachmentMapFor(attachmentRows)
  const hazards = records.filter(row => row.record_type === 'hazard').map(row => {
    const base = mapRecord(row, attachmentsByRecord)
    const timeline = [
      mapTimelineNode(
        `${row.record_id}-reported`,
        '隐患上报',
        row.reporter_name,
        row.reported_at || row.occurred_at,
        row.hazard_description || row.summary,
      ),
    ]
    if (row.rectified_at) {
      timeline.push(mapTimelineNode(
        `${row.record_id}-rectified`,
        '整改提交',
        row.assignee_name,
        row.rectified_at,
        row.summary,
      ))
    }
    if (row.closed_at) {
      timeline.push(mapTimelineNode(
        `${row.record_id}-closed`,
        '复查闭环',
        row.assignee_name,
        row.closed_at,
        '隐患已完成闭环',
      ))
    }
    return {
      ...base,
      feature_type: 'hazard',
      description: row.hazard_description || row.summary || '',
      hazard_level: row.hazard_level || '',
      reporter: row.reporter_name || '',
      reported_at: row.reported_at || row.occurred_at,
      responsible_person: row.assignee_name || '',
      rectification_deadline: row.rectification_deadline || '',
      rectified_at: row.rectified_at || '',
      closed_at: row.closed_at || '',
      photos: base.evidence_files.filter(item => item.kind === '现场照片'),
      rectification_photos: base.evidence_files.filter(item => item.kind === '整改照片'),
      timeline,
    }
  })
  const patrols = records.filter(row => row.record_type === 'inspection').map(row => {
    const base = mapRecord(row, attachmentsByRecord)
    const patrolStatus = /漏检/.test(row.business_status || row.inspection_result || '')
      ? '漏检'
      : Number(row.abnormal_count || 0) > 0 ||
          /异常|不正常|不合格|隐患|问题/.test(row.inspection_result || '')
        ? '异常'
        : '正常'
    return {
      ...base,
      feature_type: 'patrol',
      status: patrolStatus,
      route_name: row.inspection_type || row.title,
      checkpoint: row.point_name || row.title,
      inspector: row.inspector_name || '',
      checked_at: row.inspected_at || row.occurred_at,
      item_count: Number(row.item_count || 0),
      abnormal_count: Number(row.abnormal_count || 0),
      result_summary: row.inspection_result || row.summary || '',
      linked_hazard_id: row.linked_hazard_id || '',
      photos: base.evidence_files,
      timeline: [
        mapTimelineNode(
          `${row.record_id}-checked`,
          '巡检提交',
          row.inspector_name,
          row.inspected_at || row.occurred_at,
          row.inspection_result || row.summary,
        ),
      ],
    }
  })
  const permits = records.filter(row => row.record_type === 'work_permit').map(row => {
    const base = mapRecord(row, attachmentsByRecord)
    const timeline = [
      mapTimelineNode(
        `${row.record_id}-submitted`,
        '作业票提交',
        row.applicant_name,
        row.occurred_at,
        row.summary,
      ),
    ]
    if (row.permit_completed_at) {
      timeline.push(mapTimelineNode(
        `${row.record_id}-completed`,
        '作业完成',
        row.applicant_name,
        row.permit_completed_at,
        '作业票已完成',
      ))
    }
    return {
      ...base,
      feature_type: 'workPermit',
      permit_type: row.permit_type || '',
      location: row.location || '',
      applicant: row.applicant_name || '',
      planned_start: row.planned_start || '',
      planned_end: row.planned_end || '',
      guardian: row.guardian_name || '',
      completed_at: row.permit_completed_at || '',
      attachments: base.evidence_files,
      timeline,
    }
  })
  const trainings = records.filter(row => row.record_type === 'training').map(row => {
    const base = mapRecord(row, attachmentsByRecord)
    const score = row.exam_score === null ? null : Number(row.exam_score)
    return {
      ...base,
      feature_type: 'training',
      person_name: row.participant_name || '',
      course_name: row.training_title || row.title,
      method: row.training_method || '',
      started_at: row.training_started_at || '',
      completed_at: row.training_ended_at || row.occurred_at,
      exam_result: row.passed === null ? '未考试' : row.passed ? '合格' : '不合格',
      score: score ?? 0,
      participants: [{
        id: `${row.record_id}-participant`,
        name: row.participant_name || '',
        joined_at: row.training_started_at || row.occurred_at,
        completed: Boolean(row.training_ended_at),
        score,
        passed: row.passed === null ? null : Boolean(row.passed),
      }],
      attachments: base.evidence_files,
      timeline: [
        mapTimelineNode(
          `${row.record_id}-training`,
          '培训考试记录',
          row.participant_name,
          row.training_ended_at || row.occurred_at,
          row.summary,
        ),
      ],
    }
  })
  const closed = hazards.filter(item => /已整改|已复查|已闭环|销号|无需处理/.test(item.status)).length
  const warnings = Number(qualityRows[0]?.issue_count || 0)
    ? [{ type: 'data-quality-open', message: `存在 ${qualityRows[0].issue_count} 条待处理数据质量问题` }]
    : []

  return {
    project_id: projectId,
    project_name: project.project_name,
    project_slug: project.project_slug,
    county_id: project.county_id,
    county_name: project.county_name,
    county_slug: project.county_slug,
    source: 'mysql',
    source_environment: environment,
    demo_data: false,
    generated_at: new Date().toISOString(),
    summary: {
      company_count: companies.length,
      hazard_count: hazards.length,
      patrol_count: patrols.length,
      work_permit_count: permits.length,
      training_count: trainings.length,
      closed_hazard_count: closed,
      pending_hazard_count: Math.max(0, hazards.length - closed),
    },
    companies: companies.map(company => ({
      project_id: company.project_id,
      county_name: project.county_name,
      company_id: company.company_id,
      company_name: company.company_name,
      industry: company.industry || '',
      address: company.address || '',
      contact_name: company.contact_name || '',
      contact_phone: company.contact_phone || '',
      status: company.status,
      enabled_at: company.enabled_at || '',
      enabled_features: {
        hazard: true,
        patrol: true,
        workPermit: true,
        training: true,
      },
      source: 'mysql',
      demo_data: false,
    })),
    hazard_reports: hazards,
    patrol_records: patrols,
    work_permits: permits,
    training_exam_records: trainings,
    warnings,
  }
}
