import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  Home,
  Menu,
  Radar,
  ShieldCheck,
  TicketCheck,
  X,
} from 'lucide-react'
import {
  HazardsPage,
  PatrolsPage,
  TrainingPage,
  WorkPermitsPage,
} from './pages'
import { CompaniesPage, CompanyDetailPage, OverviewPage } from './firstPhasePages'
import { usePingxiangDashboardData } from './usePingxiangDashboardData'
import './PingxiangGovDashboard.css'

type PlatformRouteKey = 'overview' | 'hazards' | 'workPermits' | 'patrols' | 'training' | 'companies' | 'companyDetail'

const navItems = [
  { key: 'overview', label: '运行总览', path: '/gov/pingxiang', icon: Home },
  { key: 'companies', label: '企业清单', path: '/gov/pingxiang/companies', icon: Building2 },
  { key: 'hazards', label: '隐患整改', path: '/gov/pingxiang/hazards', icon: ShieldCheck },
  { key: 'patrols', label: '巡检点检', path: '/gov/pingxiang/patrols', icon: Radar },
  { key: 'workPermits', label: '作业票', path: '/gov/pingxiang/work-permits', icon: TicketCheck },
  { key: 'training', label: '培训考试', path: '/gov/pingxiang/training', icon: GraduationCap },
] satisfies Array<{ key: PlatformRouteKey; label: string; path: string; icon: typeof Home }>

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

const latestUpdateText = (dates: string[]) => dates.filter(date => date && date !== '暂无更新').sort().at(-1) || '暂无有效数据'

export default function PingxiangGovDashboard() {
  const location = useLocation()
  const route = parsePlatformRoute(location.pathname)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const dataState = usePingxiangDashboardData()
  const pageProps = {
    data: dataState.data,
    overview: dataState.overview,
    companies: dataState.companies,
    isRealView: dataState.isRealView,
  }
  const activeKey = route.key === 'companyDetail' ? 'companies' : route.key
  const dataUpdatedAt = latestUpdateText(dataState.companies.map(item => item.latestUpdate))

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
    <div className={`pxgov-shell ${collapsed ? 'pxgov-sidebar-collapsed' : ''}`}>
      <header className="pxgov-topbar">
        <div className="pxgov-topbar-brand">
          <button className="pxgov-mobile-menu" type="button" aria-label="打开导航" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="pxgov-brand-mark"><ShieldCheck size={25} /></span>
          <div>
            <h1>平乡县企业安全管理四项闭环试点运行看板</h1>
            <p>首批试点企业运行数据汇总展示</p>
          </div>
        </div>
        <div className="pxgov-topbar-meta">
          <div><span>当前县域</span><strong>平乡县</strong></div>
          <div><span>数据更新至</span><strong>{dataUpdatedAt}</strong></div>
          <div><span>当前状态</span><strong className={dataState.hasLoadError ? 'pxgov-status-error-text' : ''}>{dataState.hasLoadError ? '数据加载异常' : '试运行'}</strong></div>
          <button className="pxgov-notice-button" type="button" onClick={() => setNoticeOpen(value => !value)}>
            <CircleHelp size={17} /> 数据说明
          </button>
        </div>
        {noticeOpen && (
          <div className="pxgov-topbar-notice" role="dialog" aria-label="数据说明">
            <button type="button" aria-label="关闭数据说明" onClick={() => setNoticeOpen(false)}><X size={17} /></button>
            <strong>数据使用边界</strong>
            <p>本平台数据来源于试点企业端实际记录及项目归集数据。数据展示范围、更新时间和完整程度受企业实际使用情况、数据配置及归集周期影响。</p>
            <p>平台数据主要用于了解试点运行情况，不替代企业安全管理，也不作为监管执法认定依据。</p>
          </div>
        )}
      </header>

      <aside className={`pxgov-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="pxgov-sidebar-head">
          <div>
            <span>试点运行平台</span>
            <strong>政府端只读看板</strong>
          </div>
          <button className="pxgov-sidebar-close" type="button" aria-label="关闭导航" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <nav aria-label="平乡县平台导航">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                className={activeKey === item.key ? 'active' : ''}
                to={item.path}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {!collapsed && <ChevronRight className="pxgov-nav-chevron" size={16} />}
              </Link>
            )
          })}
        </nav>
        <div className="pxgov-sidebar-foot">
          <ClipboardCheck size={18} />
          <div><strong>只读查看</strong><span>不提供审批、整改或执法操作</span></div>
        </div>
        <button className="pxgov-collapse-button" type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? '展开导航' : '收起导航'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span>{collapsed ? '' : '收起导航'}</span>
        </button>
      </aside>
      {mobileOpen && <button className="pxgov-mobile-mask" type="button" aria-label="关闭导航" onClick={() => setMobileOpen(false)} />}

      <main className="pxgov-platform-main">
        {dataState.status === 'loading' && dataState.mode === 'real' && <div className="pxgov-loading-bar"><span />正在归集最新运行数据</div>}
        {dataState.hasLoadError && <div className="pxgov-error-banner">数据暂未完成加载，请稍后刷新查看。当前页面未使用演示数据替代。</div>}
        {renderPage()}
      </main>
    </div>
  )
}
