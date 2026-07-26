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
    industry?: string
    address?: string
    contact_name?: string
    contact_phone?: string
    status?: string
    enabled_at?: string
    enabled_features?: Partial<Record<'hazard' | 'patrol' | 'workPermit' | 'training', boolean>>
  }>
  hazard_reports?: Array<Record<string, unknown>>
  patrol_records?: Array<Record<string, unknown>>
  work_permits?: Array<Record<string, unknown>>
  training_exam_records?: Array<Record<string, unknown>>
  warnings?: Array<string | { message?: string }>
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

const isClosedHazard = (status: string) => status.includes('已整改') || status.includes('已复查') || status.includes('已闭环') || status.includes('销号')
const isOverdueHazard = (status: string) => status.includes('超期')
const isAbnormalPatrol = (status: string) => status.includes('异常') || status.includes('漏检')

const runStatusFromCounts = (recordCount: number): RunStatus => (
  recordCount > 0 ? '近期有有效记录' : '尚未形成有效记录'
)

const toEvidenceFiles = (value: unknown) => (
  Array.isArray(value)
    ? value.map((item, index) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {}
      const rawKind = String(record.kind || '附件')
      const kind = ['现场照片', '整改照片', '附件'].includes(rawKind)
        ? rawKind as '现场照片' | '整改照片' | '附件'
        : '附件'
      return {
        id: String(record.id || `real-evidence-${index + 1}`),
        name: String(record.name || '现场附件'),
        url: String(record.url || ''),
        kind,
      }
    })
    : []
)

const toTimeline = (value: unknown) => (
  Array.isArray(value)
    ? value.map((item, index) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {}
      const rawStatus = String(record.status || 'done')
      return {
        id: String(record.id || `real-timeline-${index + 1}`),
        title: String(record.title || '业务记录'),
        person: String(record.person || ''),
        time: String(record.time || ''),
        note: String(record.note || ''),
        status: (['done', 'current', 'pending'].includes(rawStatus) ? rawStatus : 'done') as 'done' | 'current' | 'pending',
      }
    })
    : []
)

const normalizeHazardLevel = (value: unknown): HazardRecord['level'] => {
  const level = String(value || '')
  if (/高|重大|严重/.test(level)) return '高'
  if (/低|一般/.test(level)) return '低'
  return '中'
}

const toPilotCompany = (company: NonNullable<GovDashboardResponse['companies']>[number], index: number): PilotCompany => ({
  project_id,
  company_id: company.company_id || `real-company-${index + 1}`,
  company_name: company.company_name || company.caoliao_enterprise_name || '未识别企业',
  industry: company.industry || '暂无行业信息',
  address: company.address || '暂无地址信息',
  contact_name: company.contact_name || '暂无联系人',
  contact_phone: company.contact_phone || '',
  enabled: true,
  enabled_at: company.enabled_at || '',
  status: company.status || 'active',
  enabled_features: {
    hazard: company.enabled_features?.hazard ?? true,
    workPermit: company.enabled_features?.workPermit ?? true,
    patrol: company.enabled_features?.patrol ?? true,
    training: company.enabled_features?.training ?? true,
  },
  role: 'gov_viewer',
  demo_data: false,
})

const toHazardRecord = (item: Record<string, unknown>, index: number): HazardRecord => ({
  project_id,
  company_id: String(item.company_id || 'unknown-company'),
  id: String(item.id || `real-hazard-${index + 1}`),
  title: String(item.title || '草料隐患上报'),
  description: String(item.description || ''),
  level: normalizeHazardLevel(item.hazard_level),
  status: String(item.status || '待整改') as HazardRecord['status'],
  reporter: String(item.reporter || item.submitter || ''),
  reported_at: String(item.reported_at || item.submitted_at || ''),
  deadline: String(item.rectification_deadline || ''),
  responsible_person: String(item.responsible_person || item.submitter || ''),
  rectified_at: String(item.rectified_at || ''),
  closed_at: String(item.closed_at || ''),
  photos: toEvidenceFiles(item.photos),
  rectification_photos: toEvidenceFiles(item.rectification_photos),
  timeline: toTimeline(item.timeline),
  demo_data: false,
})

const toPatrolRecord = (item: Record<string, unknown>, index: number): PatrolRecord => ({
  project_id,
  company_id: String(item.company_id || 'unknown-company'),
  id: String(item.id || `real-patrol-${index + 1}`),
  route_name: String(item.route_name || item.service_type || item.title || '草料巡检记录'),
  checkpoint: String(item.checkpoint || item.title || item.result_summary || '现场检查点'),
  status: String(item.status || '正常') as PatrolRecord['status'],
  inspector: String(item.inspector || item.submitter || ''),
  checked_at: String(item.checked_at || item.submitted_at || ''),
  item_count: Number(item.item_count || 0),
  abnormal_count: Number(item.abnormal_count || 0),
  result_summary: String(item.result_summary || ''),
  photos: toEvidenceFiles(item.photos),
  linked_hazard_id: String(item.linked_hazard_id || ''),
  timeline: toTimeline(item.timeline),
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
  planned_start: String(item.planned_start || ''),
  planned_end: String(item.planned_end || ''),
  guardian: String(item.guardian || ''),
  completed_at: String(item.completed_at || ''),
  attachments: toEvidenceFiles(item.attachments),
  timeline: toTimeline(item.timeline),
  demo_data: false,
})

const toTrainingRecord = (item: Record<string, unknown>, index: number): TrainingRecord => ({
  project_id,
  company_id: String(item.company_id || 'unknown-company'),
  id: String(item.id || `real-training-${index + 1}`),
  person_name: String(item.person_name || item.submitter || ''),
  course_name: String(item.course_name || item.title || '培训考试'),
  method: String(item.method || ''),
  status: String(item.status || '已完成') as TrainingRecord['status'],
  exam_result: String(item.exam_result || '合格') as TrainingRecord['exam_result'],
  score: Number(item.score || 0),
  started_at: String(item.started_at || ''),
  completed_at: String(item.completed_at || item.submitted_at || ''),
  participants: Array.isArray(item.participants)
    ? item.participants as TrainingRecord['participants']
    : [],
  attachments: toEvidenceFiles(item.attachments),
  timeline: toTimeline(item.timeline),
  demo_data: false,
})

export const buildDemoDashboardData = (): DashboardViewData => {
  const companyDisplay = pilotCompanies.reduce<Record<string, CompanyDisplayItem>>((acc, company, index) => {
    const companyHazards = hazardRecords.filter(item => item.company_id === company.company_id)
    const companyPatrols = patrolRecords.filter(item => item.company_id === company.company_id)
    const companyTrainings = trainingRecords.filter(item => item.company_id === company.company_id)
    const participants = companyTrainings.flatMap(item => item.participants || [])
    const examined = participants.filter(item => item.score !== null)
    const passed = examined.filter(item => item.passed)
    const recordCount = companyHazards.length + companyPatrols.length + workPermitRecords.filter(item => item.company_id === company.company_id).length + companyTrainings.length
    acc[company.company_id] = {
      shortName: shortCompanyName(company.company_name),
      status: runStatusFromCounts(recordCount),
      openHazards: companyHazards.filter(item => !isClosedHazard(item.status)).length,
      abnormalPatrols: companyPatrols.filter(item => isAbnormalPatrol(item.status)).length,
      trainingPassRate: examined.length ? Math.round((passed.length / examined.length) * 100) : 0,
      position: positionForIndex(index),
    }
    return acc
  }, {})

  const fixedHazards = hazardRecords.filter(item => isClosedHazard(item.status)).length
  const overdueHazards = hazardRecords.filter(item => isOverdueHazard(item.status)).length
  const patrolAbnormal = patrolRecords.filter(item => isAbnormalPatrol(item.status)).length
  const permitPending = workPermitRecords.filter(item => item.status === '待审批' || item.status === '审批中').length
  const permitCompleted = workPermitRecords.filter(item => item.status === '已完成').length
  const participants = trainingRecords.flatMap(item => item.participants || [])
  const trainingCompleted = participants.filter(item => item.completed).length
  const examined = participants.filter(item => item.score !== null)
  const trainingPassed = examined.filter(item => item.passed).length

  return {
    companies: pilotCompanies,
    hazardRecords,
    patrolRecords,
    workPermitRecords,
    trainingRecords,
    companyDisplay,
    overview: {
      hazardTotal: hazardRecords.length,
      fixedHazards,
      pendingHazards: hazardRecords.length - fixedHazards,
      overdueHazards,
      closureRate: hazardRecords.length ? Math.round((fixedHazards / hazardRecords.length) * 100) : 0,
      permitTotal: workPermitRecords.length,
      permitPending,
      permitCompleted,
      patrolTotal: patrolRecords.length,
      patrolNormal: patrolRecords.length - patrolAbnormal,
      patrolAbnormal,
      trainingPeople: participants.length,
      trainingCompleted,
      passRate: examined.length ? Math.round((trainingPassed / examined.length) * 100) : 0,
    },
    warnings: [],
    isRealData: false,
  }
}

export const adaptGovDashboardResponse = (payload: GovDashboardResponse): DashboardViewData => {
  const baseCompanies = (payload.companies || []).map(toPilotCompany)
  const realHazards = (payload.hazard_reports || []).map(toHazardRecord)
  const realPatrols = (payload.patrol_records || []).map(toPatrolRecord)
  const realWorkPermits = (payload.work_permits || []).map(toWorkPermitRecord)
  const realTrainings = (payload.training_exam_records || []).map(toTrainingRecord)
  const realCompanies = baseCompanies
  const warnings = normalizeWarnings(payload.warnings)

  const companyDisplay = realCompanies.reduce<Record<string, CompanyDisplayItem>>((acc, company, index) => {
    const companyHazards = realHazards.filter(item => item.company_id === company.company_id)
    const companyPatrols = realPatrols.filter(item => item.company_id === company.company_id)
    const companyPermits = realWorkPermits.filter(item => item.company_id === company.company_id)
    const companyTrainings = realTrainings.filter(item => item.company_id === company.company_id)
    const openHazards = companyHazards.filter(item => !isClosedHazard(item.status)).length
    const abnormalPatrols = companyPatrols.filter(item => isAbnormalPatrol(item.status)).length
    const passedTrainings = companyTrainings.filter(item => String(item.exam_result).includes('合格')).length

    acc[company.company_id] = {
      shortName: shortCompanyName(company.company_name),
      status: runStatusFromCounts(companyHazards.length + companyPatrols.length + companyPermits.length + companyTrainings.length),
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
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (response.status === 401 && !import.meta.env.DEV) {
    const returnTo = `${window.location.pathname}${window.location.search}`
    window.location.assign(`/platform/login?returnTo=${encodeURIComponent(returnTo)}`)
    throw new Error('登录状态已失效')
  }
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
    if (!import.meta.env.DEV) throw error
    payload = await fetchDashboardPayload('http://127.0.0.1:8787/api/gov/pingxiang/dashboard')
  }
  return adaptGovDashboardResponse(payload)
}
