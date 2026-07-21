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
  SearchCheck,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePingxiangDashboardData } from '../pingxiang-gov/usePingxiangDashboardData'
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
} from './PingxiangGovSecondaryPagesV2'
import { EnvironmentNotice } from './VisualComponents'
import { dataSourceText, isDataAvailable, latestRecordTime } from './visualModel'

const navItems = [
  { href: '/gov/pingxiang', label: '运行总览', icon: LayoutDashboard, exact: true },
  { href: '/gov/pingxiang/companies', label: '企业清单', icon: Building2 },
  { href: '/gov/pingxiang/hazards', label: '隐患整改', icon: AlertTriangle },
  { href: '/gov/pingxiang/patrols', label: '巡检点检', icon: SearchCheck },
  { href: '/gov/pingxiang/work-permits', label: '作业票管理', icon: FileCheck2 },
  { href: '/gov/pingxiang/training', label: '培训考试', icon: GraduationCap },
  { href: '/gov/pingxiang/reports', label: '阶段报告', icon: FileBarChart },
  { href: '/gov/pingxiang/about', label: '项目说明', icon: ClipboardList },
]

const routeIsActive = (pathname: string, href: string, exact?: boolean) => exact ? pathname === href || pathname === `${href}/` : pathname.startsWith(href)

export default function PingxiangGovPlatformV2() {
  const location = useLocation()
  const state = usePingxiangDashboardData()
  const [showDataHelp, setShowDataHelp] = useState(false)
  const available = isDataAvailable(state)
  const companyDetailMatch = location.pathname.match(/^\/gov\/pingxiang\/company\/([^/]+)\/?$/)
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
  if (companyDetailMatch) page = <CompanyDetailPageV2 state={state} companyId={decodeURIComponent(companyDetailMatch[1])} />
  else if (location.pathname.startsWith('/gov/pingxiang/companies')) page = <CompaniesPageV2 state={state} />
  else if (location.pathname.startsWith('/gov/pingxiang/hazards')) page = <HazardsPageV2 state={state} />
  else if (location.pathname.startsWith('/gov/pingxiang/patrols')) page = <PatrolsPageV2 state={state} />
  else if (location.pathname.startsWith('/gov/pingxiang/work-permits')) page = <WorkPermitsPageV2 state={state} />
  else if (location.pathname.startsWith('/gov/pingxiang/training')) page = <TrainingPageV2 state={state} />
  else if (location.pathname.startsWith('/gov/pingxiang/reports')) page = <ReportsPageV2 state={state} />
  else if (location.pathname.startsWith('/gov/pingxiang/about')) page = <ProjectAboutPageV2 state={state} />

  return (
    <div className="pxv2-shell">
      <header className="pxv2-header">
        <Link className="pxv2-brand" to="/gov/pingxiang" aria-label="返回运行总览">
          <span className="pxv2-brand-mark"><Landmark size={29} /></span>
          <div><h1>平乡县企业现场安全管理运行平台</h1><p>四项功能试点运行监测</p></div>
        </Link>
        <div className="pxv2-header-facts">
          <div><CalendarClock size={16} /><span>最近有效数据</span><strong>{available ? latestRecordTime(state.data) : '暂无数据'}</strong></div>
          <div><Database size={16} /><span>数据来源</span><strong>{sourceLabel}</strong></div>
          <div><Building2 size={16} /><span>纳入企业</span><strong>{available ? `${state.companies.length} 家` : '暂无数据'}</strong></div>
          <div><CircleCheckBig size={16} /><span>运行状态</span><strong>{environmentLabel}</strong></div>
        </div>
        <div className="pxv2-header-actions">
          <span className={`pxv2-env-badge ${state.mode === 'demo' ? 'demo' : state.status === 'error' ? 'error' : 'real'}`}><ShieldCheck size={15} />{environmentLabel}</span>
          <button className="pxv2-data-help" type="button" onClick={() => setShowDataHelp(value => !value)} aria-expanded={showDataHelp}><HelpCircle size={18} /><span>数据说明</span></button>
          {showDataHelp && <div className="pxv2-data-popover"><strong>数据口径说明</strong><p>{dataSourceText(state)}</p><p>页面仅展示已成功归集的数据；缺失或归集失败时统一显示“暂无数据”。</p></div>}
        </div>
      </header>

      <aside className="pxv2-sidebar">
        <nav aria-label="平乡县政府端功能导航">
          {navItems.map(item => {
            const Icon = item.icon
            const active = routeIsActive(location.pathname, item.href, item.exact) || (item.href === '/gov/pingxiang/companies' && Boolean(companyDetailMatch))
            return <Link key={item.href} className={active ? 'active' : ''} to={item.href}><Icon size={19} /><span>{item.label}</span>{active && <ChevronRight className="pxv2-active-arrow" size={16} />}</Link>
          })}
        </nav>
        <div className="pxv2-sidebar-bottom">
          <div className="pxv2-side-note"><strong>项目运行说明</strong><p>本平台为政府端只读运行视图，数据以企业实际记录及项目归集结果为准。</p></div>
          <div className="pxv2-support"><HelpCircle size={16} /><span>技术支持：安巡数智科技有限公司</span></div>
        </div>
      </aside>

      <main className="pxv2-main">
        <EnvironmentNotice demo={state.mode === 'demo'} status={state.status} message={dataSourceText(state)} />
        {page}
      </main>

      <footer className="pxv2-footer"><span>平乡县企业现场安全管理运行平台</span><div><span>项目实施与平台技术支持：安巡数智科技有限公司</span><span>政府端只读视图</span></div></footer>
    </div>
  )
}
