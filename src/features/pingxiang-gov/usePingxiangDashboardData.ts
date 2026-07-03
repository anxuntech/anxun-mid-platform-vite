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

const storageKey = 'pingxiang-gov-data-mode'
const demoDashboardData = buildDemoDashboardData()

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

const isClosedHazard = (status: string) => status.includes('已整改') || status.includes('已复查') || status.includes('已闭环')
const isOverdueHazard = (status: string) => status.includes('超期')
const isAbnormalPatrol = (status: string) => status.includes('异常') || status.includes('漏检')

const latestText = (values: string[]) => values.filter(Boolean).sort().at(-1) || '暂无更新'

const makeCompanyRuntime = (data: DashboardViewData, company: PilotCompany): CompanyRuntime => {
  const hazards = data.hazardRecords.filter(item => item.company_id === company.company_id)
  const patrols = data.patrolRecords.filter(item => item.company_id === company.company_id)
  const permits = data.workPermitRecords.filter(item => item.company_id === company.company_id)
  const trainings = data.trainingRecords.filter(item => item.company_id === company.company_id)
  const display = data.companyDisplay[company.company_id]

  return {
    company,
    shortName: display?.shortName || company.company_name,
    runningStatus: display?.status || '运行良好',
    hazards,
    patrols,
    permits,
    trainings,
    openHazards: display?.openHazards ?? hazards.filter(item => !isClosedHazard(item.status)).length,
    closedHazards: hazards.filter(item => isClosedHazard(item.status)).length,
    overdueHazards: hazards.filter(item => isOverdueHazard(item.status)).length,
    abnormalPatrols: display?.abnormalPatrols ?? patrols.filter(item => isAbnormalPatrol(item.status)).length,
    trainingPassRate: display?.trainingPassRate ?? 0,
    latestUpdate: latestText([
      ...hazards.map(item => item.reported_at),
      ...patrols.map(item => item.checked_at),
      ...permits.map(item => item.submitted_at),
      ...trainings.map(item => item.completed_at),
    ]),
  }
}

export const usePingxiangDashboardData = () => {
  const [mode, setModeState] = useState<PingxiangDataMode>(() => {
    try {
      return sessionStorage.getItem(storageKey) === 'real' ? 'real' : 'demo'
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
    setMessage('真实数据加载中')

    fetchGovPingxiangDashboard()
      .then(data => {
        if (cancelled) return
        setRealData(data)
        setStatus('ready')
        setMessage('当前为真实接口数据，来源于本地草料 JSONL 聚合接口')
      })
      .catch(error => {
        if (cancelled) return
        setRealData(null)
        setStatus('error')
        setMessage('真实数据暂不可用，当前显示演示数据')
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  const setMode = (nextMode: PingxiangDataMode) => {
    setModeState(nextMode)
    try {
      sessionStorage.setItem(storageKey, nextMode)
    } catch {
      // Session storage only keeps the mode while navigating inside the demo platform.
    }
    if (nextMode === 'demo') {
      setMessage('')
      return
    }
    setStatus('idle')
  }

  const data = mode === 'real' && status === 'ready' && realData ? realData : demoDashboardData
  const companies = useMemo(() => data.companies.map(company => makeCompanyRuntime(data, company)), [data])
  const companyMap = useMemo(() => new Map(companies.map(item => [item.company.company_id, item])), [companies])

  return {
    mode,
    setMode,
    status,
    message: mode === 'demo' ? '当前为演示数据，用于展示四项闭环业务流程' : message || '当前为真实接口数据，来源于本地草料 JSONL 聚合接口',
    usingFallbackDemo: mode === 'real' && status === 'error',
    data,
    overview: data.overview,
    companies,
    companyMap,
    isRealView: data.isRealData,
  }
}
