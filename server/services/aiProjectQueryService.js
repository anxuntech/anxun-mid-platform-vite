import { buildProtectedPingxiangData } from './govPingxiangDataService.js'

const closedHazard = status => /已整改|已复查|已闭环|销号|无需处理/.test(String(status || ''))
const dateValue = value => {
  const normalized = String(value || '').trim().replace(' ', 'T')
  const withZone = normalized && !/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
    ? `${normalized}+08:00`
    : normalized
  const parsed = Date.parse(withZone)
  return Number.isNaN(parsed) ? 0 : parsed
}

const recordDate = record =>
  record.reported_at || record.checked_at || record.submitted_at || record.completed_at || ''

const allRecords = dashboard => [
  ...(dashboard.hazard_reports || []).map(item => ({ ...item, recordType: 'hazard' })),
  ...(dashboard.patrol_records || []).map(item => ({ ...item, recordType: 'inspection' })),
  ...(dashboard.work_permits || []).map(item => ({ ...item, recordType: 'work_permit' })),
  ...(dashboard.training_exam_records || []).map(item => ({ ...item, recordType: 'training' })),
]

const resolveRange = params => {
  const end = params.endDate
    ? new Date(`${params.endDate}T23:59:59+08:00`)
    : new Date()
  const start = params.startDate
    ? new Date(`${params.startDate}T00:00:00+08:00`)
    : new Date(end.getTime() - (Math.max(1, params.periodDays || 30) - 1) * 86_400_000)
  return {
    start,
    end,
    startText: start.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }),
    endText: end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }),
  }
}

const inRange = (record, range) => {
  const timestamp = dateValue(recordDate(record))
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime()
}

const companyMatches = (record, company) =>
  !company || String(record.company_id) === String(company.company_id)

const findCompany = (dashboard, params) => {
  if (params.companyId) {
    return dashboard.companies.find(item => String(item.company_id) === String(params.companyId)) || null
  }
  if (params.companyName) {
    return dashboard.companies.find(item => item.company_name.includes(params.companyName)) || null
  }
  return null
}

const itemView = item => ({
  id: item.id || item.company_id,
  companyId: item.company_id,
  companyName: item.company_name,
  title: item.title || item.company_name,
  status: item.status || '暂无状态',
  occurredAt: recordDate(item),
  recordType: item.recordType || 'company',
})

const comparePeriods = (records, range, periodDays) => {
  const currentStart = range.start.getTime()
  const previousEnd = currentStart - 1
  const previousStart = previousEnd - Math.max(1, periodDays) * 86_400_000 + 1
  const current = records.filter(item => inRange(item, range)).length
  const previous = records.filter(item => {
    const timestamp = dateValue(recordDate(item))
    return timestamp >= previousStart && timestamp <= previousEnd
  }).length
  return { current, previous, change: current - previous }
}

const answerFor = ({ intent, total, company, range, metrics }) => {
  const subject = company?.company_name || '当前授权项目'
  const period = `${range.startText} 至 ${range.endText}`
  if (intent === 'project_summary') {
    return `${period}，${subject}共归集 ${metrics.recordCount} 条业务记录，涉及 ${metrics.companyCount} 家企业；其中未闭环隐患 ${metrics.openHazards} 条。`
  }
  if (intent === 'company_summary') {
    return company
      ? `${period}，${company.company_name}共归集 ${metrics.recordCount} 条记录，其中隐患 ${metrics.hazards} 条、巡检 ${metrics.inspections} 条、作业票 ${metrics.workPermits} 条、培训 ${metrics.trainings} 条。`
      : '未在当前授权项目中找到指定企业，请检查企业名称后重试。'
  }
  if (intent === 'compare_periods') {
    const direction = metrics.change > 0 ? `增加 ${metrics.change}` : metrics.change < 0 ? `减少 ${Math.abs(metrics.change)}` : '持平'
    return `${subject}本期归集 ${metrics.current} 条记录，上期 ${metrics.previous} 条，环比${direction}条。`
  }
  const labels = {
    query_hazards: '隐患',
    query_unclosed_hazards: '未闭环隐患',
    query_inactive_companies: '近期无有效记录企业',
    query_inspections: '巡检点检',
    query_work_permits: '作业票',
    query_trainings: '培训考试',
  }
  return `${period}，${subject}共查询到 ${total} 条${labels[intent] || '相关'}记录。`
}

export const executeControlledProjectQuery = async ({
  projectId,
  parsedIntent,
  sourceEnvironment = 'test',
}) => {
  const dashboard = await buildProtectedPingxiangData({
    projectId,
    sourceEnvironment,
  })
  const { intent, params } = parsedIntent
  const range = resolveRange(params)
  const requestedCompany = Boolean(params.companyId || params.companyName)
  const company = findCompany(dashboard, params)
  if (requestedCompany && !company) {
    return {
      intent,
      params,
      answer: answerFor({ intent: 'company_summary', total: 0, company: null, range, metrics: {} }),
      scope: {
        projectId,
        countyName: dashboard.county_name,
        companyName: params.companyName || params.companyId,
        startDate: range.startText,
        endDate: range.endText,
        sourceEnvironment,
      },
      metrics: {},
      total: 0,
      items: [],
      project: {
        projectId,
        projectName: dashboard.project_name,
        countyName: dashboard.county_name,
      },
    }
  }

  const records = allRecords(dashboard).filter(item =>
    companyMatches(item, company) && inRange(item, range))
  let selected = records
  if (intent === 'query_hazards') selected = records.filter(item => item.recordType === 'hazard')
  if (intent === 'query_unclosed_hazards') {
    selected = records.filter(item => item.recordType === 'hazard' && !closedHazard(item.status))
  }
  if (intent === 'query_inspections') selected = records.filter(item => item.recordType === 'inspection')
  if (intent === 'query_work_permits') selected = records.filter(item => item.recordType === 'work_permit')
  if (intent === 'query_trainings') selected = records.filter(item => item.recordType === 'training')
  if (params.status) selected = selected.filter(item => String(item.status || '').includes(params.status))

  if (intent === 'query_inactive_companies') {
    selected = dashboard.companies.filter(item =>
      !records.some(record => String(record.company_id) === String(item.company_id)))
  }

  const metrics = {
    companyCount: dashboard.companies.length,
    recordCount: records.length,
    hazards: records.filter(item => item.recordType === 'hazard').length,
    inspections: records.filter(item => item.recordType === 'inspection').length,
    workPermits: records.filter(item => item.recordType === 'work_permit').length,
    trainings: records.filter(item => item.recordType === 'training').length,
    openHazards: records.filter(item => item.recordType === 'hazard' && !closedHazard(item.status)).length,
  }
  if (intent === 'compare_periods') {
    Object.assign(metrics, comparePeriods(
      allRecords(dashboard).filter(item => companyMatches(item, company)),
      range,
      params.comparisonPeriodDays,
    ))
  }
  const total = intent === 'project_summary' || intent === 'company_summary'
    ? records.length
    : selected.length
  const items = (intent === 'project_summary' || intent === 'company_summary' ? records : selected)
    .slice(0, 100)
    .slice(0, 10)
    .map(itemView)

  return {
    intent,
    params,
    answer: answerFor({ intent, total, company, range, metrics }),
    scope: {
      projectId,
      countyName: dashboard.county_name,
      companyName: company?.company_name || '全部企业',
      status: params.status || '全部状态',
      startDate: range.startText,
      endDate: range.endText,
      sourceEnvironment,
    },
    metrics,
    total,
    items,
    project: {
      projectId,
      projectName: dashboard.project_name,
      countyName: dashboard.county_name,
    },
  }
}
