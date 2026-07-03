import { Link, useLocation } from 'react-router-dom'
import { Building2, Database, Home, ShieldCheck } from 'lucide-react'
import {
  CompaniesPage,
  CompanyDetailPage,
  HazardsPage,
  OverviewPage,
  PatrolsPage,
  TrainingPage,
  WorkPermitsPage,
} from './pages'
import { usePingxiangDashboardData, type PingxiangDataMode } from './usePingxiangDashboardData'
import './PingxiangGovDashboard.css'

type PlatformRouteKey = 'overview' | 'hazards' | 'workPermits' | 'patrols' | 'training' | 'companies' | 'companyDetail'

const navItems: Array<{ key: PlatformRouteKey; label: string; path: string }> = [
  { key: 'overview', label: '运行总览', path: '/gov/pingxiang' },
  { key: 'hazards', label: '隐患闭环', path: '/gov/pingxiang/hazards' },
  { key: 'workPermits', label: '作业票', path: '/gov/pingxiang/work-permits' },
  { key: 'patrols', label: '巡检巡查', path: '/gov/pingxiang/patrols' },
  { key: 'training', label: '培训考试', path: '/gov/pingxiang/training' },
  { key: 'companies', label: '企业清单', path: '/gov/pingxiang/companies' },
]

const parsePlatformRoute = (pathname: string): { key: PlatformRouteKey; companyId?: string } => {
  if (pathname === '/gov/pingxiang/hazards') return { key: 'hazards' }
  if (pathname === '/gov/pingxiang/work-permits') return { key: 'workPermits' }
  if (pathname === '/gov/pingxiang/patrols') return { key: 'patrols' }
  if (pathname === '/gov/pingxiang/training') return { key: 'training' }
  if (pathname === '/gov/pingxiang/companies') return { key: 'companies' }
  if (pathname.startsWith('/gov/pingxiang/company/')) {
    return { key: 'companyDetail', companyId: decodeURIComponent(pathname.replace('/gov/pingxiang/company/', '')) }
  }
  return { key: 'overview' }
}

export default function PingxiangGovDashboard() {
  const location = useLocation()
  const route = parsePlatformRoute(location.pathname)
  const dataState = usePingxiangDashboardData()
  const pageProps = {
    data: dataState.data,
    overview: dataState.overview,
    companies: dataState.companies,
    isRealView: dataState.isRealView,
  }

  const renderPage = () => {
    if (route.key === 'hazards') return <HazardsPage {...pageProps} />
    if (route.key === 'workPermits') return <WorkPermitsPage {...pageProps} />
    if (route.key === 'patrols') return <PatrolsPage {...pageProps} />
    if (route.key === 'training') return <TrainingPage {...pageProps} />
    if (route.key === 'companies') return <CompaniesPage {...pageProps} />
    if (route.key === 'companyDetail') return <CompanyDetailPage {...pageProps} companyId={route.companyId || ''} />
    return <OverviewPage {...pageProps} />
  }

  return (
    <div className="pxgov-shell pxgov-platform-shell">
      <header className="pxgov-platform-header">
        <div className="pxgov-brand">
          <div className="pxgov-brand-icon"><ShieldCheck size={24} /></div>
          <div>
            <div className="pxgov-kicker">平乡县首批企业安全管理四项闭环试点</div>
            <h1>平乡县企业安全管理运行平台</h1>
            <p>隐患上报｜作业票管理｜巡检巡查｜培训考试｜风险减量服务数据支撑</p>
          </div>
        </div>
        <div className="pxgov-platform-actions">
          <button className="pxgov-county-switch" type="button" title="其他县域接入后可在此切换">
            县域切换：平乡县
          </button>
          <div className="pxgov-data-switch" aria-label="数据模式切换">
            {(['demo', 'real'] as PingxiangDataMode[]).map(mode => (
              <button key={mode} className={dataState.mode === mode ? 'pxgov-data-active' : ''} type="button" onClick={() => dataState.setMode(mode)}>
                {mode === 'demo' ? '演示数据' : '真实数据'}
              </button>
            ))}
          </div>
          <div className="pxgov-hero-tags">
            <Database size={13} />
            {dataState.message}｜只读查看｜企业{dataState.companies.length}家
          </div>
        </div>
      </header>

      <nav className="pxgov-platform-nav" aria-label="平乡县平台导航">
        {navItems.map(item => (
          <Link key={item.key} className={route.key === item.key ? 'active' : ''} to={item.path}>
            {item.key === 'overview' ? <Home size={15} /> : <Building2 size={15} />}
            {item.label}
          </Link>
        ))}
      </nav>

      {dataState.usingFallbackDemo && <div className="pxgov-mode-alert">{dataState.message}</div>}

      <main className="pxgov-platform-main">
        {renderPage()}
      </main>
    </div>
  )
}
