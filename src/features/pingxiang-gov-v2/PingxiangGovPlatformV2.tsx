import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  Database,
  FileBarChart,
  FileCheck2,
  GraduationCap,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  LogOut,
  SearchCheck,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePingxiangDashboardData, type PingxiangDataMode } from '../pingxiang-gov/usePingxiangDashboardData'
import type { AuthSession } from '../../auth'
import PingxiangGovOverviewV2 from './PingxiangGovOverviewV2'
import './PingxiangGovOverviewV2.css'
import {
  CompaniesPageV2,
  CompanyDetailPageV2,
  HazardsPageV2,
  PatrolsPageV2,
  ProjectAboutPageV2,
  ReportsPageV2,
  TrainingPageV2,
  WorkPermitsPageV2,
  ReportPreviewPageV2,
} from './PingxiangGovSecondaryPagesV2'
import { BusinessRecordDetailPage, findBusinessRecord, type BusinessKind } from './RecordDetailsV2'
import { EnvironmentNotice } from './VisualComponents'
import { dataSourceText, isDataAvailable, latestRecordTime } from './visualModel'
import type { GovProjectConfig } from '../gov-projects/projectConfig'
import DataAssistant from './DataAssistant'

const navItems = [
  { href: '/gov/pingxiang', label: '运行总览', icon: LayoutDashboard, exact: true },
  { href: '/gov/pingxiang/companies', label: '企业清单', icon: Building2 },
  { href: '/gov/pingxiang/hazards', label: '隐患整改', icon: AlertTriangle },
  { href: '/gov/pingxiang/inspections', label: '巡检点检', icon: SearchCheck },
  { href: '/gov/pingxiang/work-permits', label: '作业票管理', icon: FileCheck2 },
  { href: '/gov/pingxiang/trainings', label: '培训考试', icon: GraduationCap },
  { href: '/gov/pingxiang/reports', label: '阶段报告', icon: FileBarChart },
  { href: '/gov/pingxiang/about', label: '项目说明', icon: ClipboardList },
]

const routeIsActive = (pathname: string, href: string, exact?: boolean) => exact ? pathname === href || pathname === `${href}/` : pathname.startsWith(href)

export default function PingxiangGovPlatformV2({
  forcedMode = 'demo',
  basePath = '/gov/pingxiang',
  projectConfig,
  authSession,
  onLogout,
}: {
  forcedMode?: PingxiangDataMode
  basePath?: string
  projectConfig: GovProjectConfig
  authSession?: AuthSession
  onLogout?: () => void | Promise<void>
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = usePingxiangDashboardData({
    forcedMode,
    projectId: projectConfig.projectId,
    dashboardEndpoint: projectConfig.dashboardEndpoint,
    demoProject: {
      projectId: projectConfig.projectId,
      countyName: projectConfig.countyName,
      companyPrefix: projectConfig.companyPrefix,
    },
  })
  const [showDataHelp, setShowDataHelp] = useState(false)
  const available = isDataAvailable(state)
  const canonicalPathname = location.pathname.replace(basePath, '/gov/pingxiang')
  const companyDetailMatch = canonicalPathname.match(/^\/gov\/pingxiang\/(?:companies|company)\/([^/]+)\/?$/)
  const recordDetailMatch = canonicalPathname.match(/^\/gov\/pingxiang\/(hazards|inspections|patrols|work-permits|trainings|training)\/([^/]+)\/?$/)
  const reportDetailMatch = canonicalPathname.match(/^\/gov\/pingxiang\/reports\/([^/]+)\/?$/)
  const sourceLabel = state.mode === 'demo'
    ? '内部演示数据'
    : state.status === 'ready'
      ? '企业实际记录及项目归集数据'
      : state.status === 'error'
        ? '归集暂不可用'
        : '正在归集'
  const environmentLabel = state.mode === 'demo'
    ? '演示环境'
    : state.status === 'error'
      ? '归集异常'
      : state.status === 'ready'
        ? '真实数据'
        : '归集中'

  let page = <PingxiangGovOverviewV2 state={state} />
  if (recordDetailMatch) {
    const segment = recordDetailMatch[1]
    const kind: BusinessKind = segment === 'hazards' ? 'hazard' : segment === 'inspections' || segment === 'patrols' ? 'inspection' : segment === 'work-permits' ? 'permit' : 'training'
    const record = findBusinessRecord(state, kind, decodeURIComponent(recordDetailMatch[2]))
    const returnPath = kind === 'hazard' ? 'hazards' : kind === 'inspection' ? 'inspections' : kind === 'permit' ? 'work-permits' : 'trainings'
    page = record ? <BusinessRecordDetailPage state={state} kind={kind} record={record} /> : <div className="pxv21-route-empty"><strong>未找到该记录</strong><Link to={`${basePath}/${returnPath}`}>返回对应清单</Link></div>
  }
  else if (reportDetailMatch) page = <ReportPreviewPageV2 state={state} reportId={decodeURIComponent(reportDetailMatch[1])} />
  else if (companyDetailMatch) page = <CompanyDetailPageV2 state={state} companyId={decodeURIComponent(companyDetailMatch[1])} />
  else if (canonicalPathname.startsWith('/gov/pingxiang/companies')) page = <CompaniesPageV2 state={state} />
  else if (canonicalPathname.startsWith('/gov/pingxiang/hazards')) page = <HazardsPageV2 state={state} />
  else if (canonicalPathname.startsWith('/gov/pingxiang/inspections') || canonicalPathname.startsWith('/gov/pingxiang/patrols')) page = <PatrolsPageV2 state={state} />
  else if (canonicalPathname.startsWith('/gov/pingxiang/work-permits')) page = <WorkPermitsPageV2 state={state} />
  else if (canonicalPathname.startsWith('/gov/pingxiang/trainings') || canonicalPathname.startsWith('/gov/pingxiang/training')) page = <TrainingPageV2 state={state} />
  else if (canonicalPathname.startsWith('/gov/pingxiang/reports')) page = <ReportsPageV2 state={state} />
  else if (canonicalPathname.startsWith('/gov/pingxiang/about')) page = <ProjectAboutPageV2 state={state} />

  const keepProjectNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (basePath === '/gov/pingxiang') return
    const anchor = (event.target as HTMLElement).closest('a')
    const href = anchor?.getAttribute('href') || ''
    if (href === basePath || href.startsWith(`${basePath}/`)) return
    if (!href.startsWith('/gov/pingxiang')) return
    event.preventDefault()
    navigate(href.replace(/^\/gov\/pingxiang/, basePath))
  }

  return (
    <div className="pxv2-shell" onClickCapture={keepProjectNavigation}>
      <header className="pxv2-header">
        <Link className="pxv2-brand" to={basePath} aria-label="返回运行总览">
          <span className="pxv2-brand-mark"><Landmark size={29} /></span>
          <div><h1>{projectConfig.platformTitle}</h1><p>{projectConfig.platformSubtitle}</p></div>
        </Link>
        <div className="pxv2-header-facts">
          <div><CalendarClock size={16} /><span>最近有效数据</span><strong>{available ? latestRecordTime(state.data) : '暂无数据'}</strong></div>
          <div><Database size={16} /><span>数据来源</span><strong>{sourceLabel}</strong></div>
          <div><Building2 size={16} /><span>纳入企业</span><strong>{available ? `${state.companies.length} 家` : '暂无数据'}</strong></div>
          <div><CircleCheckBig size={16} /><span>运行状态</span><strong>{environmentLabel}</strong></div>
        </div>
        <div className="pxv2-header-actions">
          {authSession && <span className="pxv2-auth-user"><UserRound size={16} /><span>{authSession.organizationName}</span></span>}
          <span className={`pxv2-env-badge ${state.mode === 'demo' ? 'demo' : state.status === 'error' ? 'error' : 'real'}`}><ShieldCheck size={15} />{environmentLabel}</span>
          <button className="pxv2-data-help" type="button" onClick={() => setShowDataHelp(value => !value)} aria-expanded={showDataHelp}><HelpCircle size={18} /><span>数据说明</span></button>
          {authSession && onLogout && <button className="pxv2-data-help" type="button" onClick={() => onLogout()}><LogOut size={17} /><span>退出登录</span></button>}
          {showDataHelp && <div className="pxv2-data-popover"><strong>数据口径说明</strong><p>{dataSourceText(state)}</p><p>页面仅展示已成功归集的数据；缺失或归集失败时统一显示“暂无数据”。</p></div>}
        </div>
      </header>

      <aside className="pxv2-sidebar">
        <nav aria-label={`${projectConfig.countyName}政府端功能导航`}>
          {navItems.map(item => {
            const Icon = item.icon
            const active = routeIsActive(canonicalPathname, item.href, item.exact) || (item.href === '/gov/pingxiang/companies' && Boolean(companyDetailMatch))
            return <Link key={item.href} className={active ? 'active' : ''} to={item.href.replace('/gov/pingxiang', basePath)}><Icon size={19} /><span>{item.label}</span>{active && <ChevronRight className="pxv2-active-arrow" size={16} />}</Link>
          })}
        </nav>
      </aside>

      <main className="pxv2-main">
        <EnvironmentNotice demo={state.mode === 'demo'} status={state.status} message={dataSourceText(state)} />
        {page}
      </main>

      {authSession?.role === 'admin' && projectConfig.mode === 'real' && (
        <DataAssistant config={projectConfig} />
      )}
      <footer className="pxv2-footer"><span>{projectConfig.platformTitle}</span><div><span>项目实施与平台技术支持：安巡数智科技有限公司</span><span>政府端只读视图</span></div></footer>
    </div>
  )
}
