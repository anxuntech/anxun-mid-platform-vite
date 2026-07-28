import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  Database,
  FileText,
  SearchCheck,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { buildQueryHref } from './BusinessComponents'
import { InteractiveTrendChart } from './InteractiveTrendChart'
import { CompanyQuickDrawer } from './PingxiangGovSecondaryPagesV2'
import { EmptyVisual, MetricTile, Panel, ScopeNote, type VisualChartSeries, type VisualMetric } from './VisualComponents'
import {
  dataSourceText,
  formatDisplayValue,
  hazardTrendRows,
  isDataAvailable,
  latestRecordTime,
  monthLabel,
  patrolTrendRows,
  trainingParticipantCount,
  type PingxiangDataState,
} from './visualModel'

const isOlderThan30Days = (value: string) => {
  if (!value || value === '暂无更新') return true
  const timestamp = Date.parse(value.replace(' ', 'T'))
  return Number.isNaN(timestamp) || Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000
}

export default function PingxiangGovOverviewV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const enabledCount = state.companies.filter(item => item.company.enabled).length
  const activeCount = state.companies.filter(item => item.runningStatus === '近期有有效记录').length
  const hazards = hazardTrendRows(state.data)
  const patrols = patrolTrendRows(state.data)
  const hazardSeries: VisualChartSeries[] = [
    { label: '当月新增隐患', color: '#1677ff', values: hazards.map(item => item.added) },
    { label: '当月完成整改', color: '#f07639', values: hazards.map(item => item.rectified) },
    { label: '当月完成复查/销号', color: '#45ad65', values: hazards.map(item => item.closed) },
    { label: '月末未闭环', color: '#7b4ce2', values: hazards.map(item => item.openAtEnd) },
  ]
  const patrolSeries: VisualChartSeries[] = [
    { label: '巡检记录数', color: '#1677ff', values: patrols.map(item => item.total) },
    { label: '发现问题记录数', color: '#f07639', values: patrols.map(item => item.abnormal) },
  ]
  const statusCounts = [
    { label: '近期有有效记录', value: state.companies.filter(item => item.runningStatus === '近期有有效记录').length, color: '#54b969', definition: '近30日存在至少1条有效业务记录' },
    { label: '近期记录较少', value: state.companies.filter(item => item.runningStatus === '近期记录较少').length, color: '#3c8cf0', definition: '已形成记录，但近30日无新增记录' },
    { label: '尚未形成有效记录', value: state.companies.filter(item => item.runningStatus === '尚未形成有效记录').length, color: '#a8b5c5', definition: '开通后尚无有效业务记录' },
  ]
  const totalCompanies = statusCounts.reduce((sum, item) => sum + item.value, 0)
  const percentages = statusCounts.map(item => totalCompanies ? (item.value / totalCompanies) * 100 : 0)
  const donutBackground = `conic-gradient(${statusCounts[0].color} 0 ${percentages[0]}%, ${statusCounts[1].color} ${percentages[0]}% ${percentages[0] + percentages[1]}%, ${statusCounts[2].color} ${percentages[0] + percentages[1]}% 100%)`
  const attentionCompanies = state.companies.filter(item => isOlderThan30Days(item.latestUpdate)).slice(0, 6)
  const metrics: VisualMetric[] = [
    { label: '试点企业数', value: formatDisplayValue(available, state.companies.length), unit: '家', note: '查看全部试点企业', icon: Building2, tone: 'blue', href: '/gov/pingxiang/companies?source=首页指标' },
    { label: '已开通企业数', value: formatDisplayValue(available, enabledCount), unit: '家', note: '筛选已完成基础配置企业', icon: CircleCheckBig, tone: 'green', href: '/gov/pingxiang/companies?enabled=已开通&source=首页指标' },
    { label: '有效运行企业数', value: formatDisplayValue(available, activeCount), unit: '家', note: '近30日有有效记录', icon: TrendingUp, tone: 'violet', href: '/gov/pingxiang/companies?status=近期有有效记录&source=首页指标' },
    { label: '隐患记录数', value: formatDisplayValue(available, state.overview.hazardTotal), unit: '条', note: '查看当前周期全部隐患', icon: ClipboardList, tone: 'orange', href: '/gov/pingxiang/hazards?source=首页指标' },
    { label: '已复查/销号数', value: formatDisplayValue(available, state.overview.fixedHazards), unit: '条', note: '查看已完成闭环记录', icon: BadgeCheck, tone: 'blue', href: '/gov/pingxiang/hazards?status=已销号&source=首页指标' },
    { label: '巡检记录数', value: formatDisplayValue(available, state.overview.patrolTotal), unit: '条', note: '查看现场巡检清单', icon: SearchCheck, tone: 'green', href: '/gov/pingxiang/inspections?source=首页指标' },
    { label: '作业票记录数', value: formatDisplayValue(available, state.overview.permitTotal), unit: '张', note: '查看审批与归档记录', icon: FileText, tone: 'cyan', href: '/gov/pingxiang/work-permits?source=首页指标' },
    { label: '培训参与人次', value: formatDisplayValue(available, trainingParticipantCount(state.data)), unit: '人次', note: '查看培训与考试明细', icon: UsersRound, tone: 'violet', href: '/gov/pingxiang/trainings?source=首页指标' },
  ]
  const previewCompany = params.get('previewCompany')
  const routeBase = '/gov/pingxiang'
  const chartHref = (base: string, period: string, series?: string) => {
    const updates = new URLSearchParams({ month: period, source: '首页趋势图' })
    if (series?.includes('销号')) updates.set('status', '已销号')
    if (series?.includes('问题')) updates.set('result', '存在异常')
    navigate(`${base.replace(/^\/gov\/pingxiang/, routeBase)}?${updates.toString()}`)
  }

  return (
    <div className="pxv2-page-stack">
      <section className="pxv2-metric-band" aria-label="核心运行指标">{metrics.map(item => <MetricTile key={item.label} item={item} />)}</section>
      <section className="pxv2-chart-layout">
        <Panel title="隐患整改闭环趋势" note="悬浮查看同月全部数值，点击月份进入清单">
          <ScopeNote>新增按上报时间统计；完成整改按整改提交时间统计；完成复查/销号按闭环时间统计；月末未闭环为截至月末仍未销号记录。</ScopeNote>
          {available ? <InteractiveTrendChart labels={hazards.map(item => monthLabel(item.period))} periods={hazards.map(item => item.period)} series={hazardSeries} maxValue={Math.max(5, ...hazardSeries.flatMap(item => item.values))} extras={hazards.map(item => [{ label: '闭环率', value: `${item.closureRate}%` }, { label: '涉及企业', value: `${item.companyCount}家` }])} onPointClick={(period, series) => chartHref('/gov/pingxiang/hazards', period, series)} /> : <EmptyVisual />}
        </Panel>
        <Panel title="巡检记录与问题趋势" note="当前无明确应巡检计划，因此不计算完成率">
          <ScopeNote>巡检记录按检查时间统计；问题发现率=发现问题记录数÷巡检记录数。只有存在明确巡检计划和应完成次数时才计算完成率。</ScopeNote>
          {available ? <InteractiveTrendChart labels={patrols.map(item => monthLabel(item.period))} periods={patrols.map(item => item.period)} series={patrolSeries} maxValue={Math.max(5, ...patrolSeries.flatMap(item => item.values))} extras={patrols.map(item => [{ label: '问题发现率', value: `${item.issueRate}%` }, { label: '涉及企业', value: `${item.companyCount}家` }])} onPointClick={(period, series) => chartHref('/gov/pingxiang/inspections', period, series)} /> : <EmptyVisual />}
        </Panel>
        <Panel title="企业运行状态分布" note="悬浮查看定义，点击筛选企业清单">
          {!available || !totalCompanies ? <EmptyVisual /> : <div className="pxv2-donut-layout"><div className="pxv2-donut" style={{ background: donutBackground }}><div><strong>{totalCompanies}</strong><span>企业总数</span></div></div><div className="pxv2-donut-legend is-clickable">{statusCounts.map((item, index) => <Link key={item.label} title={item.definition} to={`/gov/pingxiang/companies?status=${encodeURIComponent(item.label)}&source=运行状态分布`}><i style={{ background: item.color }} /><span>{item.label}<small>{item.definition}</small></span><strong>{item.value}家（{Math.round(percentages[index])}%）</strong></Link>)}</div></div>}
        </Panel>
      </section>
      <section className="pxv2-bottom-layout">
        <Panel title="近30日无新增有效记录企业" note="点击行快速查看，企业名称进入完整档案" action={<Link className="pxv2-panel-link-inline" to="/gov/pingxiang/companies">查看全部 <ChevronRight size={15} /></Link>}>
          {!available ? <EmptyVisual /> : !attentionCompanies.length ? <EmptyVisual title="当前暂无需提示企业" /> : <div className="pxv2-table-wrap"><table><thead><tr><th>企业名称</th><th>所属行业</th><th>最近有效记录</th><th>提示原因</th><th>操作</th></tr></thead><tbody>{attentionCompanies.map(item => <tr key={item.company.company_id}><td><Link className="pxv2-table-link" to={`/gov/pingxiang/companies/${item.company.company_id}`}>{item.company.company_name}</Link></td><td>{item.company.industry}</td><td>{item.latestUpdate}</td><td>{item.latestUpdate === '暂无更新' ? '尚未形成有效记录' : '近30日无新增有效记录'}</td><td><Link className="pxv2-detail-button" state={{ drawer: true }} to={buildQueryHref(location.pathname, location.search, { previewCompany: item.company.company_id })}>快速查看</Link></td></tr>)}</tbody></table></div>}
        </Panel>
        <Panel title="数据更新与归集说明"><div className="pxv2-notice-list"><div><span className="blue"><Database size={19} /></span><p>{dataSourceText(state)}</p></div><div><span className="violet"><ClipboardList size={19} /></span><p>{state.mode === 'demo' ? '首页、清单、详情和报告均由同一演示数据模型生成。' : '首页、清单、详情和报告均使用当前账号授权范围内的项目数据。'}</p></div><div><span className="green"><SearchCheck size={19} /></span><p>数据缺失时显示“暂无数据”，不会自动用其他数字补齐。</p></div></div><div className="pxv2-update-time">最近有效数据时间：{available ? latestRecordTime(state.data) : '暂无数据'}</div></Panel>
      </section>
      {previewCompany && <CompanyQuickDrawer state={state} companyId={previewCompany} fromHref={`${location.pathname}${location.search}`} />}
    </div>
  )
}
