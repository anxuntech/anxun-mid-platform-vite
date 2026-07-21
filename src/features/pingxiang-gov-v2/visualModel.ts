import type { DashboardViewData } from '../pingxiang-gov/dashboardAdapter'
import type { CompanyRuntime, usePingxiangDashboardData } from '../pingxiang-gov/usePingxiangDashboardData'

export type PingxiangDataState = ReturnType<typeof usePingxiangDashboardData>

export const isDataAvailable = (state: PingxiangDataState) => state.mode === 'demo' || state.status === 'ready'

export const companyName = (companies: CompanyRuntime[], companyId: string) => (
  companies.find(item => item.company.company_id === companyId)?.company.company_name || '未识别企业'
)

export const latestRecordTime = (data: DashboardViewData) => {
  const values = [
    ...data.hazardRecords.map(item => item.reported_at),
    ...data.patrolRecords.map(item => item.checked_at),
    ...data.workPermitRecords.map(item => item.submitted_at),
    ...data.trainingRecords.map(item => item.completed_at),
  ].filter(Boolean).sort()
  return values[values.length - 1] || '暂无数据'
}

export const monthKey = (value: string) => value?.slice(0, 7) || ''

export const recentMonthKeys = (values: string[], limit = 6) => (
  Array.from(new Set(values.map(monthKey).filter(value => /^\d{4}-\d{2}$/.test(value)))).sort().slice(-limit)
)

export const monthLabel = (value: string) => value ? `${value.slice(5)}月` : ''

export const isClosedHazard = (status: string) => (
  status.includes('已整改') || status.includes('已复查') || status.includes('已闭环') || status.includes('销号')
)

export const isAbnormalPatrol = (status: string) => status.includes('异常') || status.includes('漏检') || status.includes('问题')

export const isPassedTraining = (result: string) => result.includes('合格') && !result.includes('不合格')

export const hasExplicitPatrolPlan = (data: DashboardViewData) => (
  data.patrolRecords.some(record => {
    const candidate = record as typeof record & { planned_count?: number; completed_count?: number }
    return Number.isFinite(candidate.planned_count) && Number(candidate.planned_count) > 0 && Number.isFinite(candidate.completed_count)
  })
)

export const formatDisplayValue = (available: boolean, value: string | number) => available ? value : null

export const demoPeriods = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

export const formatDateTime = (value?: string) => value || '未提供'

export const trainingParticipantCount = (data: DashboardViewData) => data.trainingRecords.reduce((sum, record) => sum + (record.participants?.length || 1), 0)

export const hazardTrendRows = (data: DashboardViewData, periods = demoPeriods) => periods.map(period => {
  const records = data.hazardRecords.filter(item => monthKey(item.reported_at) === period)
  const rectified = data.hazardRecords.filter(item => monthKey(item.rectified_at || '') === period)
  const closed = data.hazardRecords.filter(item => monthKey(item.closed_at || '') === period)
  const monthEnd = `${period}-31 23:59`
  const openAtEnd = data.hazardRecords.filter(item => item.reported_at <= monthEnd && (!item.closed_at || item.closed_at > monthEnd))
  return {
    period,
    added: records.length,
    rectified: rectified.length,
    closed: closed.length,
    openAtEnd: openAtEnd.length,
    closureRate: records.length ? Math.round((closed.length / records.length) * 100) : 0,
    companyCount: new Set(records.map(item => item.company_id)).size,
  }
})

export const patrolTrendRows = (data: DashboardViewData, periods = demoPeriods) => periods.map(period => {
  const records = data.patrolRecords.filter(item => monthKey(item.checked_at) === period)
  const abnormal = records.filter(item => isAbnormalPatrol(item.status))
  return {
    period,
    total: records.length,
    abnormal: abnormal.length,
    issueRate: records.length ? Math.round((abnormal.length / records.length) * 100) : 0,
    companyCount: new Set(records.map(item => item.company_id)).size,
  }
})

export type UnifiedBusinessRecord = {
  id: string
  kind: '隐患' | '巡检' | '作业票' | '培训'
  companyId: string
  title: string
  person: string
  time: string
  status: string
  href: string
}

export const unifiedBusinessRecords = (data: DashboardViewData): UnifiedBusinessRecord[] => [
  ...data.hazardRecords.map(item => ({ id: item.id, kind: '隐患' as const, companyId: item.company_id, title: item.title, person: item.reporter || item.responsible_person, time: item.reported_at, status: item.status, href: `/gov/pingxiang/hazards/${item.id}` })),
  ...data.patrolRecords.map(item => ({ id: item.id, kind: '巡检' as const, companyId: item.company_id, title: item.checkpoint, person: item.inspector, time: item.checked_at, status: item.status, href: `/gov/pingxiang/inspections/${item.id}` })),
  ...data.workPermitRecords.map(item => ({ id: item.id, kind: '作业票' as const, companyId: item.company_id, title: item.permit_type, person: item.applicant, time: item.submitted_at, status: item.status, href: `/gov/pingxiang/work-permits/${item.id}` })),
  ...data.trainingRecords.map(item => ({ id: item.id, kind: '培训' as const, companyId: item.company_id, title: item.title || item.course_name, person: item.person_name, time: item.started_at || item.completed_at, status: item.status, href: `/gov/pingxiang/trainings/${item.id}` })),
].sort((a, b) => b.time.localeCompare(a.time))

export const dataSourceText = (state: PingxiangDataState) => {
  if (state.mode === 'demo') return '内部演示数据，仅用于页面功能与业务流程展示'
  if (state.status === 'error') return '真实数据归集暂不可用，页面不会使用演示数字补齐'
  if (state.status === 'loading' || state.status === 'idle') return '正在连接企业端实际记录及项目归集数据'
  return '企业端实际记录及项目归集数据'
}
