import {
  hazardRecords,
  patrolRecords,
  pilotCompanies,
  trainingRecords,
  workPermitRecords,
} from './data'
import type {
  HazardRecord,
  PatrolRecord,
  PilotCompany,
  TrainingRecord,
  WorkPermitRecord,
} from './types'

export type RunStatus = '近期有有效记录' | '近期记录较少' | '尚未形成有效记录'

export type CompanyDisplayItem = {
  shortName: string
  status: RunStatus
  openHazards: number
  abnormalPatrols: number
  trainingPassRate: number
  position: string
}

export type DashboardOverview = {
  hazardTotal: number
  fixedHazards: number
  pendingHazards: number
  overdueHazards: number
  closureRate: number
  permitTotal: number
  permitPending: number
  permitCompleted: number
  patrolTotal: number
  patrolNormal: number
  patrolAbnormal: number
  trainingPeople: number
  trainingCompleted: number
  passRate: number
}

export type DashboardViewData = {
  companies: PilotCompany[]
  hazardRecords: HazardRecord[]
  patrolRecords: PatrolRecord[]
  workPermitRecords: WorkPermitRecord[]
  trainingRecords: TrainingRecord[]
  companyDisplay: Record<string, CompanyDisplayItem>
  overview: DashboardOverview
  warnings: string[]
  isRealData: boolean
}

type GovDashboardResponse = {
  success?: boolean
  project_id?: string
  county_name?: string
  summary?: {
    company_count?: number
    hazard_count?: number
    patrol_count?: number
    work_permit_count?: number
    training_count?: number
    closed_hazard_count?: number
    pending_hazard_count?: number
  }
  companies?: Array<{
    company_id?: string
    company_name?: string
    caoliao_enterprise_name?: string
  }>
  hazard_reports?: Array<Record<string, unknown>>
  patrol_records?: Array<Record<string, unknown>>
  work_permits?: Array<Record<string, unknown>>
  training_exam_records?: Array<Record<string, unknown>>
  warnings?: Array<string | { message?: string }>
}

const demoCompanyDisplay: Record<string, CompanyDisplayItem> = {
  'px-company-001': { shortName: '兴安机械', status: '近期有有效记录', openHazards: 0, abnormalPatrols: 0, trainingPassRate: 96, position: 'pos-a' },
  'px-company-002': { shortName: '宏达童车', status: '近期有有效记录', openHazards: 1, abnormalPatrols: 1, trainingPassRate: 90, position: 'pos-b' },
  'px-company-003': { shortName: '瑞通橡塑', status: '近期有有效记录', openHazards: 2, abnormalPatrols: 3, trainingPassRate: 84, position: 'pos-c' },
}

const demoOverview: DashboardOverview = {
  hazardTotal: 15,
  fixedHazards: 12,
  pendingHazards: 3,
  overdueHazards: 1,
  closureRate: 80,
  permitTotal: 15,
  permitPending: 3,
  permitCompleted: 10,
  patrolTotal: 30,
  patrolNormal: 26,
  patrolAbnormal: 4,
  trainingPeople: 30,
  trainingCompleted: 28,
  passRate: 90,
}

const project_id = 'pingxiang' as const

const positionForIndex = (index: number) => ['pos-a', 'pos-b', 'pos-c'][index % 3]

const shortCompanyName = (name: string) =>
  name
    .replace(/^平乡县/, '')
    .replace(/有限公司$/, '')
    .replace(/制造|制品|配件/g, '')
    .slice(0, 4) || name

const normalizeWarnings = (warnings: GovDashboardResponse['warnings'] = []) =>
  warnings.map(item => (typeof item === 'string' ? item : item?.message || '')).filter(Boolean)

const isClosedHazard = (status: string) => status.includes('已整改') || status.includes('已复查') || status.includes('已闭环')
const isOverdueHazard = (status: string) => status.includes('超期')
const isAbnormalPatrol = (status: string) => status.includes('异常') || status.includes('漏检')

const runStatusFromCounts = (recordCount: number): RunStatus => (
  recordCount > 0 ? '近期有有效记录' : '尚未形成有效记录'
)

const toPilotCompany = (company: NonNullable<GovDashboardResponse['companies']>[number], index: number): PilotCompany => ({
  project_id,
  company_id: company.company_id || `real-company-${index + 1}`,
  company_name: company.company_name || company.caoliao_enterprise_name || '未识别企业',
  industry: '暂无行业信息',
  address: '暂无地址信息',
  contact_name: '暂无联系人',
  contact_phone: '',
  enabled: true,
  enabled_features: { hazard: true, workPermit: false, patrol: true, training: false },
  role: 'gov_viewer',
  demo_data: false,
})

const toHazardRecord = (item: Record<string, unknown>, index: number): HazardRecord => ({
  project_id,
  company_id: String(item.company_id || 'unknown-company'),
  id: String(item.id || `real-hazard-${index + 1}`),
  title: String(item.title || '草料隐患上报'),
  level: '中',
  status: String(item.status || '待整改') as HazardRecord['status'],
  reported_at: String(item.submitted_at || ''),
  deadline: String(item.rectification_deadline || ''),
  responsible_person: String(item.responsible_person || item.submitter || ''),
  demo_data: false,
})

const toPatrolRecord = (item: Record<string, unknown>, index: number): PatrolRecord => ({
  project_id,
  company_id: String(item.company_id || 'unknown-company'),
  id: String(item.id || `real-patrol-${index + 1}`),
  route_name: String(item.service_type || item.title || '草料巡检记录'),
  checkpoint: String(item.title || item.result_summary || '现场检查点'),
  status: String(item.status || '正常') as PatrolRecord['status'],
  inspector: String(item.submitter || ''),
  checked_at: String(item.submitted_at || ''),
  demo_data: false,
})

const toWorkPermitRecord = (item: Record<string, unknown>, index: number): WorkPermitRecord => ({
  project_id,
  company_id: String(item.company_id || 'unknown-company'),
  id: String(item.id || `real-work-permit-${index + 1}`),
  permit_type: String(item.permit_type || item.title || '作业票'),
  location: String(item.location || '-'),
  status: String(item.status || '待审批') as WorkPermitRecord['status'],
  applicant: String(item.applicant || item.submitter || ''),
  submitted_at: String(item.submitted_at || ''),
  demo_data: false,
})

const toTrainingRecord = (item: Record<string, unknown>, index: number): TrainingRecord => ({
  project_id,
  company_id: String(item.company_id || 'unknown-company'),
  id: String(item.id || `real-training-${index + 1}`),
  person_name: String(item.person_name || item.submitter || ''),
  course_name: String(item.course_name || item.title || '培训考试'),
  status: String(item.status || '已完成') as TrainingRecord['status'],
  exam_result: String(item.exam_result || '合格') as TrainingRecord['exam_result'],
  score: Number(item.score || 0),
  completed_at: String(item.submitted_at || ''),
  demo_data: false,
})

export const buildDemoDashboardData = (): DashboardViewData => ({
  companies: pilotCompanies,
  hazardRecords,
  patrolRecords,
  workPermitRecords,
  trainingRecords,
  companyDisplay: demoCompanyDisplay,
  overview: demoOverview,
  warnings: [],
  isRealData: false,
})

export const adaptGovDashboardResponse = (payload: GovDashboardResponse): DashboardViewData => {
  const realCompanies = (payload.companies || []).map(toPilotCompany)
  const realHazards = (payload.hazard_reports || []).map(toHazardRecord)
  const realPatrols = (payload.patrol_records || []).map(toPatrolRecord)
  const realWorkPermits = (payload.work_permits || []).map(toWorkPermitRecord)
  const realTrainings = (payload.training_exam_records || []).map(toTrainingRecord)
  const warnings = normalizeWarnings(payload.warnings)

  const companyDisplay = realCompanies.reduce<Record<string, CompanyDisplayItem>>((acc, company, index) => {
    const companyHazards = realHazards.filter(item => item.company_id === company.company_id)
    const companyPatrols = realPatrols.filter(item => item.company_id === company.company_id)
    const companyTrainings = realTrainings.filter(item => item.company_id === company.company_id)
    const openHazards = companyHazards.filter(item => !isClosedHazard(item.status)).length
    const abnormalPatrols = companyPatrols.filter(item => isAbnormalPatrol(item.status)).length
    const passedTrainings = companyTrainings.filter(item => String(item.exam_result).includes('合格')).length

    acc[company.company_id] = {
      shortName: shortCompanyName(company.company_name),
      status: runStatusFromCounts(companyHazards.length + companyPatrols.length + companyTrainings.length),
      openHazards,
      abnormalPatrols,
      trainingPassRate: companyTrainings.length > 0 ? Math.round((passedTrainings / companyTrainings.length) * 100) : 0,
      position: positionForIndex(index),
    }
    return acc
  }, {})

  const fixedHazards = realHazards.filter(item => isClosedHazard(item.status)).length
  const overdueHazards = realHazards.filter(item => isOverdueHazard(item.status)).length
  const patrolAbnormal = realPatrols.filter(item => isAbnormalPatrol(item.status)).length
  const hazardTotal = payload.summary?.hazard_count ?? realHazards.length
  const patrolTotal = payload.summary?.patrol_count ?? realPatrols.length
  const permitCompleted = realWorkPermits.filter(item => String(item.status).includes('完成') || String(item.status).includes('通过')).length
  const permitPending = realWorkPermits.filter(item => String(item.status).includes('审批') || String(item.status).includes('待')).length
  const trainingCompleted = realTrainings.filter(item => String(item.status).includes('完成')).length
  const trainingPassed = realTrainings.filter(item => String(item.exam_result).includes('合格')).length

  return {
    companies: realCompanies,
    hazardRecords: realHazards,
    patrolRecords: realPatrols,
    workPermitRecords: realWorkPermits,
    trainingRecords: realTrainings,
    companyDisplay,
    overview: {
      hazardTotal,
      fixedHazards: payload.summary?.closed_hazard_count ?? fixedHazards,
      pendingHazards: payload.summary?.pending_hazard_count ?? Math.max(0, hazardTotal - fixedHazards),
      overdueHazards,
      closureRate: hazardTotal > 0 ? Math.round(((payload.summary?.closed_hazard_count ?? fixedHazards) / hazardTotal) * 100) : 0,
      permitTotal: payload.summary?.work_permit_count ?? realWorkPermits.length,
      permitPending,
      permitCompleted,
      patrolTotal,
      patrolNormal: Math.max(0, patrolTotal - patrolAbnormal),
      patrolAbnormal,
      trainingPeople: payload.summary?.training_count ?? realTrainings.length,
      trainingCompleted,
      passRate: realTrainings.length > 0 ? Math.round((trainingPassed / realTrainings.length) * 100) : 0,
    },
    warnings,
    isRealData: true,
  }
}

const fetchDashboardPayload = async (url: string) => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`真实数据接口返回 ${response.status}`)
  const payload = await response.json()
  if (payload?.success === false) throw new Error(payload?.message || '真实数据接口返回异常')
  return payload
}

export const fetchGovPingxiangDashboard = async () => {
  let payload
  try {
    payload = await fetchDashboardPayload('/api/gov/pingxiang/dashboard')
  } catch (error) {
    payload = await fetchDashboardPayload('http://127.0.0.1:8787/api/gov/pingxiang/dashboard')
  }
  return adaptGovDashboardResponse(payload)
}
