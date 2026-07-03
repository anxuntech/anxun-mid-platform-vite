import { readFile } from 'node:fs/promises'
import path from 'node:path'

const projectId = 'pingxiang'
const countyName = '平乡县'
const source = 'caoliao'
const dataFile = path.resolve(process.cwd(), '.data', 'caoliao-business-events.jsonl')
const companyMapFile = path.resolve(process.cwd(), 'server', 'config', 'pingxiangCompanyMap.json')

const unknownCompany = {
  project_id: projectId,
  county_name: countyName,
  company_id: 'unknown-company',
  company_name: '未识别企业',
  caoliao_enterprise_name: '',
}

const safeText = value => (typeof value === 'string' ? value.trim() : '')
const normalizeText = value => safeText(value).replace(/\s+/g, '').toLowerCase()

const readCompanyMap = async warnings => {
  try {
    const companies = JSON.parse(await readFile(companyMapFile, 'utf8'))
    return Array.isArray(companies) ? companies : []
  } catch (error) {
    warnings.push({ type: 'company-map-read-failed', message: `企业映射配置读取失败：${error.message}` })
    return []
  }
}

const readJsonlEvents = async warnings => {
  try {
    const content = await readFile(dataFile, 'utf8')
    return content
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
      .filter(item => item.line)
      .flatMap(item => {
        try {
          return [JSON.parse(item.line)]
        } catch {
          warnings.push({ type: 'jsonl-parse-failed', line: item.lineNumber, message: `第 ${item.lineNumber} 行无法解析，已跳过` })
          return []
        }
      })
  } catch (error) {
    if (error?.code === 'ENOENT') {
      warnings.push({ type: 'jsonl-file-missing', message: '草料业务事件文件不存在，已返回空数据' })
      return []
    }
    warnings.push({ type: 'jsonl-read-failed', message: `草料业务事件文件读取失败：${error.message}` })
    return []
  }
}

const findFieldValue = (rawFields, keywords) => {
  const fields = Array.isArray(rawFields) ? rawFields : []
  const matched = fields.find(field => keywords.some(keyword => safeText(field?.name).includes(keyword)))
  return safeText(matched?.value)
}

const resolveCompany = (enterpriseName, companies, warnings, event) => {
  const normalizedEnterpriseName = normalizeText(enterpriseName)
  const matched = companies.find(company => {
    const caoliaoName = normalizeText(company.caoliao_enterprise_name)
    const companyName = normalizeText(company.company_name)
    return normalizedEnterpriseName && (normalizedEnterpriseName === caoliaoName || normalizedEnterpriseName === companyName)
  })

  if (matched) return matched

  warnings.push({
    type: 'company-unmatched',
    request_id: event?.requestId || '',
    enterprise_name: enterpriseName || '',
    message: enterpriseName ? `草料企业名称未匹配：${enterpriseName}` : '草料事件未识别企业名称，已归入未识别企业',
  })
  return unknownCompany
}

const getEnterpriseName = record =>
  record.enterpriseName ||
  findFieldValue(record.rawFields, ['企业名称', '单位名称', '公司名称', '企业', '单位'])

const inferHazardStatus = record => {
  if (record?.status) return record.status
  const text = `${record?.summary || ''} ${record?.hazardName || ''} ${findFieldValue(record?.rawFields, ['状态', '整改情况', '处理情况', '复查情况'])}`
  if (/已复查|复查通过|已销号|已闭环/.test(text)) return '已复查'
  if (/已整改|整改完成|已完成|无需处理/.test(text)) return '已整改'
  if (/整改中|处理中/.test(text)) return '整改中'
  if (/超期|逾期/.test(text)) return '超期未整改'
  return '待整改'
}

const inferPatrolStatus = record => {
  if (record?.status) return record.status
  const text = `${record?.resultSummary || ''} ${record?.summary || ''} ${findFieldValue(record?.rawFields, ['是否正常', '检查结果', '点检结果', '巡逻结果', '结果'])}`
  if (/异常|不正常|不合格|隐患|问题/.test(text)) return '异常'
  if (/漏检|未检/.test(text)) return '漏检'
  return '正常'
}

const buildBaseRecord = ({ event, company, featureType, title, status }) => {
  const record = event?.record || {}
  return {
    id: event?.requestId || record?.serialNumber || '',
    project_id: projectId,
    company_id: company.company_id,
    company_name: company.company_name,
    feature_type: featureType,
    title: title || record?.formName || '',
    status,
    submitter: record?.executor || record?.submitter || '',
    submitted_at: record?.submittedAt || event?.receivedAt || '',
    source,
    demo_data: false,
    raw_payload: event,
  }
}

const mapHazardReport = (event, company) => {
  const record = event?.record || {}
  return {
    ...buildBaseRecord({
      event,
      company,
      featureType: 'hazard',
      title: record.hazardName || record.summary || record.title || record.formName || '草料隐患上报',
      status: inferHazardStatus(record),
    }),
    hazard_level: record.hazardLevel || '',
    responsible_person: record.responsiblePerson || record.executor || '',
    rectification_deadline: record.rectificationDeadline || '',
  }
}

const mapPatrolRecord = (event, company) => {
  const record = event?.record || {}
  return {
    ...buildBaseRecord({
      event,
      company,
      featureType: 'patrol',
      title: record.serviceType || record.resultSummary || record.title || record.formName || '草料巡检记录',
      status: inferPatrolStatus(record),
    }),
    result_summary: record.resultSummary || record.summary || '',
    service_type: record.serviceType || record.formName || '',
  }
}

const mapWorkPermit = (event, company) => {
  const record = event?.record || {}
  return {
    ...buildBaseRecord({
      event,
      company,
      featureType: 'workPermit',
      title: record.permitType || record.formName || '作业票记录',
      status: record.permitStatus || record.status || '待审批',
    }),
    permit_type: record.permitType || record.formName || '作业票',
    location: record.location || '',
    applicant: record.applicant || record.executor || '',
  }
}

const mapTrainingExamRecord = (event, company) => {
  const record = event?.record || {}
  return {
    ...buildBaseRecord({
      event,
      company,
      featureType: 'training',
      title: record.courseName || record.formName || '培训考试记录',
      status: record.trainingStatus || record.status || '已完成',
    }),
    person_name: record.personName || record.executor || '',
    course_name: record.courseName || record.formName || '培训考试',
    exam_result: record.examResult || '合格',
    score: Number(record.score || 0),
  }
}

const uniqueCompanies = (configuredCompanies, records) => {
  const byId = new Map()
  configuredCompanies.forEach(company => {
    byId.set(company.company_id, {
      project_id: projectId,
      county_name: countyName,
      company_id: company.company_id,
      company_name: company.company_name,
      caoliao_enterprise_name: company.caoliao_enterprise_name,
      source,
      demo_data: false,
    })
  })

  records.forEach(record => {
    if (!byId.has(record.company_id)) {
      byId.set(record.company_id, {
        project_id: projectId,
        county_name: countyName,
        company_id: record.company_id,
        company_name: record.company_name,
        caoliao_enterprise_name: '',
        source,
        demo_data: false,
      })
    }
  })
  return [...byId.values()]
}

const countClosedHazards = hazardReports =>
  hazardReports.filter(item => ['已整改', '已复查', '无需处理'].includes(item.status)).length

export const buildPingxiangDashboardData = async () => {
  const warnings = []
  const [companyMap, events] = await Promise.all([readCompanyMap(warnings), readJsonlEvents(warnings)])
  const hazardReports = []
  const patrolRecords = []
  const workPermits = []
  const trainingExamRecords = []

  events.forEach(event => {
    const branch = event?.branch || event?.record?.formType
    const record = event?.record || {}
    if (!['hazard', 'serviceRecord', 'workPermit', 'trainingExam'].includes(branch)) return

    const company = resolveCompany(getEnterpriseName(record), companyMap, warnings, event)
    if (branch === 'hazard') hazardReports.push(mapHazardReport(event, company))
    if (branch === 'serviceRecord') patrolRecords.push(mapPatrolRecord(event, company))
    if (branch === 'workPermit') workPermits.push(mapWorkPermit(event, company))
    if (branch === 'trainingExam') trainingExamRecords.push(mapTrainingExamRecord(event, company))
  })

  const companies = uniqueCompanies(companyMap, [...hazardReports, ...patrolRecords, ...workPermits, ...trainingExamRecords])
  const closedHazardCount = countClosedHazards(hazardReports)

  return {
    project_id: projectId,
    county_name: countyName,
    source,
    demo_data: false,
    generated_at: new Date().toISOString(),
    summary: {
      company_count: companies.length,
      hazard_count: hazardReports.length,
      patrol_count: patrolRecords.length,
      work_permit_count: workPermits.length,
      training_count: trainingExamRecords.length,
      closed_hazard_count: closedHazardCount,
      pending_hazard_count: Math.max(0, hazardReports.length - closedHazardCount),
    },
    companies,
    hazard_reports: hazardReports,
    patrol_records: patrolRecords,
    work_permits: workPermits,
    training_exam_records: trainingExamRecords,
    warnings,
  }
}
