import { useEffect, useMemo, useState } from 'react'
import {
  buildDemoDashboardData,
  fetchGovPingxiangDashboard,
  type DashboardViewData,
  type RunStatus,
} from './dashboardAdapter'
import type { PilotCompany } from './types'

export type PingxiangDataMode = 'demo' | 'real'
export type PingxiangDataStatus = 'idle' | 'loading' | 'ready' | 'error'

const storageKey = 'pingxiang-gov-internal-demo'
const demoDashboardData = buildDemoDashboardData()
const emptyDashboardData: DashboardViewData = {
  companies: [],
  hazardRecords: [],
  patrolRecords: [],
  workPermitRecords: [],
  trainingRecords: [],
  companyDisplay: {},
  overview: {
    hazardTotal: 0,
    fixedHazards: 0,
    pendingHazards: 0,
    overdueHazards: 0,
    closureRate: 0,
    permitTotal: 0,
    permitPending: 0,
    permitCompleted: 0,
    patrolTotal: 0,
    patrolNormal: 0,
    patrolAbnormal: 0,
    trainingPeople: 0,
    trainingCompleted: 0,
    passRate: 0,
  },
  warnings: [],
  isRealData: true,
}

export type CompanyRuntime = {
  company: PilotCompany
  shortName: string
  runningStatus: RunStatus
  hazards: DashboardViewData['hazardRecords']
  patrols: DashboardViewData['patrolRecords']
  permits: DashboardViewData['workPermitRecords']
  trainings: DashboardViewData['trainingRecords']
  openHazards: number
  closedHazards: number
  overdueHazards: number
  abnormalPatrols: number
  trainingPassRate: number
  latestUpdate: string
}

const isClosedHazard = (status: string) => status.includes('已整改') || status.includes('已复查') || status.includes('已闭环') || status.includes('销号')
const isOverdueHazard = (status: string) => status.includes('超期')
const isAbnormalPatrol = (status: string) => status.includes('异常') || status.includes('漏检')

const latestText = (values: string[]) => {
  const sorted = values.filter(Boolean).sort()
  return sorted[sorted.length - 1] || '暂无更新'
}

const runtimeStatusFromLatest = (latestUpdate: string): RunStatus => {
  if (latestUpdate === '暂无更新') return '尚未形成有效记录'
  const timestamp = Date.parse(latestUpdate.replace(' ', 'T'))
  if (Number.isNaN(timestamp)) return '近期记录较少'
  const recordAge = Date.now() - timestamp
  if (recordAge > 30 * 24 * 60 * 60 * 1000) return '近期记录较少'
  return '近期有有效记录'
}

const makeCompanyRuntime = (data: DashboardViewData, company: PilotCompany): CompanyRuntime => {
  const hazards = data.hazardRecords.filter(item => item.company_id === company.company_id)
  const patrols = data.patrolRecords.filter(item => item.company_id === company.company_id)
  const permits = data.workPermitRecords.filter(item => item.company_id === company.company_id)
  const trainings = data.trainingRecords.filter(item => item.company_id === company.company_id)
  const display = data.companyDisplay[company.company_id]
  const latestUpdate = latestText([
    ...hazards.map(item => item.reported_at),
    ...patrols.map(item => item.checked_at),
    ...permits.map(item => item.submitted_at),
    ...trainings.map(item => item.completed_at),
  ])

  return {
    company,
    shortName: display?.shortName || company.company_name,
    runningStatus: runtimeStatusFromLatest(latestUpdate),
    hazards,
    patrols,
    permits,
    trainings,
    openHazards: display?.openHazards ?? hazards.filter(item => !isClosedHazard(item.status)).length,
    closedHazards: hazards.filter(item => isClosedHazard(item.status)).length,
    overdueHazards: hazards.filter(item => isOverdueHazard(item.status)).length,
    abnormalPatrols: display?.abnormalPatrols ?? patrols.filter(item => isAbnormalPatrol(item.status)).length,
    trainingPassRate: display?.trainingPassRate ?? 0,
    latestUpdate,
  }
}

export const usePingxiangDashboardData = ({ forcedMode }: { forcedMode?: PingxiangDataMode } = {}) => {
  const [mode, setModeState] = useState<PingxiangDataMode>(() => {
    if (forcedMode) return forcedMode
    try {
      const requestedMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('data') : null
      if (requestedMode === 'demo') {
        sessionStorage.setItem(storageKey, 'demo')
        return 'demo'
      }
      if (requestedMode === 'real') {
        sessionStorage.removeItem(storageKey)
        return 'real'
      }
      return 'demo'
    } catch {
      return 'demo'
    }
  })
  const [realData, setRealData] = useState<DashboardViewData | null>(null)
  const [status, setStatus] = useState<PingxiangDataStatus>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (mode !== 'real') return
    let cancelled = false

    setStatus('loading')
    setMessage('正在归集最新运行数据')

    fetchGovPingxiangDashboard()
      .then(data => {
        if (cancelled) return
        setRealData(data)
        setStatus('ready')
        setMessage('当前展示企业实际使用及项目归集数据')
      })
      .catch(error => {
        if (cancelled) return
        setRealData(null)
        setStatus('error')
        setMessage('数据暂未完成加载，请稍后刷新查看')
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  useEffect(() => {
    if (forcedMode) setModeState(forcedMode)
  }, [forcedMode])

  const setMode = (nextMode: PingxiangDataMode) => {
    if (forcedMode) return
    setModeState(nextMode)
    try {
      if (nextMode === 'demo') sessionStorage.setItem(storageKey, 'demo')
      else sessionStorage.removeItem(storageKey)
    } catch {
      // Internal demo mode remains valid for the current render if storage is unavailable.
    }
    if (nextMode === 'demo') {
      setMessage('')
      return
    }
    setStatus('idle')
  }

  const data = mode === 'demo' ? demoDashboardData : realData || emptyDashboardData
  const companies = useMemo(() => data.companies.map(company => makeCompanyRuntime(data, company)), [data])
  const companyMap = useMemo(() => new Map(companies.map(item => [item.company.company_id, item])), [companies])

  return {
    mode,
    setMode,
    status,
    message: mode === 'demo' ? '当前为演示环境，页面数据仅用于功能和业务流程展示' : message || '正在归集最新运行数据',
    hasLoadError: mode === 'real' && status === 'error',
    usingFallbackDemo: false,
    data,
    overview: data.overview,
    companies,
    companyMap,
    isRealView: data.isRealData,
  }
}
