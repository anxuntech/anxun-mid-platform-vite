import { getMysqlPool } from '../db/mysql.js'

const sourceEnvironment = () => {
  const value = String(process.env.PINGXIANG_SOURCE_ENVIRONMENT || 'real').toLowerCase()
  return ['test', 'real'].includes(value) ? value : 'real'
}

const mapRecord = row => ({
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
  demo_data: false,
})

export const buildPingxiangMysqlDashboardData = async () => {
  const pool = getMysqlPool()
  const environment = sourceEnvironment()
  const [companies] = await pool.execute(
    `SELECT DISTINCT c.company_id, c.company_name, c.project_id
       FROM companies c
       JOIN source_company_mappings m ON m.company_id = c.company_id AND m.status = 'active'
       JOIN source_connectors sc ON sc.connector_id = m.connector_id
      WHERE c.project_id = 'pingxiang'
        AND c.status = 'active'
        AND sc.enabled = 1
        AND sc.source_environment = ?
      ORDER BY c.company_name`,
    [environment],
  )
  const [records] = await pool.execute(
    `SELECT b.*, c.company_name,
            COALESCE(h.reporter_name, i.inspector_name, w.applicant_name, t.participant_name, '') AS actor_name,
            h.hazard_level, h.assignee_name, h.rectification_deadline,
            i.inspection_type, i.result AS inspection_result, i.abnormal_count,
            w.permit_type, w.location, w.applicant_name,
            t.title AS training_title, t.participant_name, t.exam_score, t.passed
       FROM business_records b
       JOIN companies c ON c.company_id = b.company_id
       LEFT JOIN hazard_records h ON h.record_id = b.record_id
       LEFT JOIN inspection_records i ON i.record_id = b.record_id
       LEFT JOIN work_permit_records w ON w.record_id = b.record_id
       LEFT JOIN training_records t ON t.record_id = b.record_id
      WHERE b.project_id = 'pingxiang' AND b.source_environment = ?
      ORDER BY b.occurred_at DESC`,
    [environment],
  )
  const [qualityRows] = await pool.execute(
    `SELECT COUNT(*) AS issue_count
       FROM data_quality_issues q
       JOIN webhook_events e ON e.event_id = q.event_id
      WHERE e.source_environment = ? AND q.status = 'open'`,
    [environment],
  )

  const hazards = records.filter(row => row.record_type === 'hazard').map(row => ({
    ...mapRecord(row),
    feature_type: 'hazard',
    hazard_level: row.hazard_level || '',
    responsible_person: row.assignee_name || '',
    rectification_deadline: row.rectification_deadline || '',
  }))
  const patrols = records.filter(row => row.record_type === 'inspection').map(row => ({
    ...mapRecord(row),
    feature_type: 'patrol',
    result_summary: row.summary || row.inspection_result || '',
    service_type: row.inspection_type || '',
  }))
  const permits = records.filter(row => row.record_type === 'work_permit').map(row => ({
    ...mapRecord(row),
    feature_type: 'workPermit',
    permit_type: row.permit_type || '',
    location: row.location || '',
    applicant: row.applicant_name || '',
  }))
  const trainings = records.filter(row => row.record_type === 'training').map(row => ({
    ...mapRecord(row),
    feature_type: 'training',
    person_name: row.participant_name || '',
    course_name: row.training_title || row.title,
    exam_result: row.passed === null ? '' : row.passed ? '合格' : '不合格',
    score: Number(row.exam_score || 0),
  }))
  const closed = hazards.filter(item => /已整改|已复查|已闭环|销号|无需处理/.test(item.status)).length
  const warnings = Number(qualityRows[0]?.issue_count || 0)
    ? [{ type: 'data-quality-open', message: `存在 ${qualityRows[0].issue_count} 条待处理数据质量问题` }]
    : []

  return {
    project_id: 'pingxiang',
    county_name: '平乡县',
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
      county_name: '平乡县',
      company_id: company.company_id,
      company_name: company.company_name,
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
