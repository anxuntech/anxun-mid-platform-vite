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
  return values.at(-1) || '暂无数据'
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

export const dataSourceText = (state: PingxiangDataState) => {
  if (state.mode === 'demo') return '内部演示数据，仅用于页面功能与业务流程展示'
  if (state.status === 'error') return '真实数据归集暂不可用，页面不会使用演示数字补齐'
  if (state.status === 'loading' || state.status === 'idle') return '正在连接企业端实际记录及项目归集数据'
  return '企业端实际记录及项目归集数据'
}
