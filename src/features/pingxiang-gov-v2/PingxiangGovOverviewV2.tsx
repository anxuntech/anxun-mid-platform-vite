import {
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
import { Link } from 'react-router-dom'
import {
  ChartLegend,
  EmptyVisual,
  LineChartSvg,
  MetricTile,
  Panel,
  ScopeNote,
  type VisualChartSeries,
  type VisualMetric,
} from './VisualComponents'
import {
  dataSourceText,
  formatDisplayValue,
  hasExplicitPatrolPlan,
  isAbnormalPatrol,
  isDataAvailable,
  latestRecordTime,
  monthKey,
  monthLabel,
  recentMonthKeys,
  type PingxiangDataState,
} from './visualModel'

const demoMonths = ['02月', '03月', '04月', '05月', '06月', '07月']

const demoHazardSeries: VisualChartSeries[] = [
  { label: '上报数', color: '#1677ff', values: [82, 111, 143, 151, 157, 166] },
  { label: '整改中', color: '#f07639', values: [45, 83, 94, 104, 111, 126] },
  { label: '已整改', color: '#45ad65', values: [35, 67, 75, 76, 79, 96] },
  { label: '已复查/销号', color: '#7b4ce2', values: [17, 22, 26, 30, 34, 56] },
]

const demoPatrolSeries: VisualChartSeries[] = [
  { label: '巡检记录', color: '#1677ff', values: [64, 78, 75, 89, 81, 92] },
  { label: '发现问题记录', color: '#f07639', values: [12, 18, 16, 24, 17, 21] },
]

const maxForSeries = (series: VisualChartSeries[]) => Math.max(1, ...series.flatMap(item => item.values))

const buildHazardTrend = (state: PingxiangDataState) => {
  if (state.mode === 'demo') return { labels: demoMonths, series: demoHazardSeries }
  const periods = recentMonthKeys(state.data.hazardRecords.map(item => item.reported_at))
  if (periods.length < 4) return null
  return {
    labels: periods.map(monthLabel),
    series: [
      { label: '上报数', color: '#1677ff', values: periods.map(period => state.data.hazardRecords.filter(item => monthKey(item.reported_at) === period).length) },
      { label: '整改中', color: '#f07639', values: periods.map(period => state.data.hazardRecords.filter(item => monthKey(item.reported_at) === period && item.status.includes('整改中')).length) },
      { label: '已整改', color: '#45ad65', values: periods.map(period => state.data.hazardRecords.filter(item => monthKey(item.reported_at) === period && item.status.includes('已整改')).length) },
      { label: '已复查/销号', color: '#7b4ce2', values: periods.map(period => state.data.hazardRecords.filter(item => monthKey(item.reported_at) === period && (item.status.includes('复查') || item.status.includes('销号') || item.status.includes('闭环'))).length) },
    ],
  }
}

const buildPatrolTrend = (state: PingxiangDataState) => {
  if (state.mode === 'demo') return { labels: demoMonths, series: demoPatrolSeries }
  const periods = recentMonthKeys(state.data.patrolRecords.map(item => item.checked_at))
  if (periods.length < 4) return null
  return {
    labels: periods.map(monthLabel),
    series: [
      { label: '巡检记录', color: '#1677ff', values: periods.map(period => state.data.patrolRecords.filter(item => monthKey(item.checked_at) === period).length) },
      { label: '发现问题记录', color: '#f07639', values: periods.map(period => state.data.patrolRecords.filter(item => monthKey(item.checked_at) === period && isAbnormalPatrol(item.status)).length) },
    ],
  }
}

const isOlderThan30Days = (value: string) => {
  if (!value || value === '暂无更新') return true
  const timestamp = Date.parse(value.replace(' ', 'T'))
  return Number.isNaN(timestamp) || Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000
}

export default function PingxiangGovOverviewV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const enabledCount = state.companies.filter(item => item.company.enabled).length
  const activeCount = state.companies.filter(item => item.runningStatus === '近期有有效记录').length
  const planAvailable = hasExplicitPatrolPlan(state.data)
  const hazardTrend = available ? buildHazardTrend(state) : null
  const patrolTrend = available ? buildPatrolTrend(state) : null
  const statusCounts = [
    { label: '近期有有效记录', value: state.companies.filter(item => item.runningStatus === '近期有有效记录').length, color: '#54b969' },
    { label: '近期记录较少', value: state.companies.filter(item => item.runningStatus === '近期记录较少').length, color: '#3c8cf0' },
    { label: '尚未形成有效记录', value: state.companies.filter(item => item.runningStatus === '尚未形成有效记录').length, color: '#a8b5c5' },
  ]
  const totalCompanies = statusCounts.reduce((sum, item) => sum + item.value, 0)
  const statusPercentages = statusCounts.map(item => totalCompanies ? (item.value / totalCompanies) * 100 : 0)
  const donutBackground = `conic-gradient(${statusCounts[0].color} 0 ${statusPercentages[0]}%, ${statusCounts[1].color} ${statusPercentages[0]}% ${statusPercentages[0] + statusPercentages[1]}%, ${statusCounts[2].color} ${statusPercentages[0] + statusPercentages[1]}% 100%)`
  const attentionCompanies = state.companies.filter(item => isOlderThan30Days(item.latestUpdate)).slice(0, 3)
  const metrics: VisualMetric[] = [
    { label: '试点企业数', value: formatDisplayValue(available, state.companies.length), unit: '家', note: '纳入当前试点范围', icon: Building2, tone: 'blue' },
    { label: '已开通企业数', value: formatDisplayValue(available, enabledCount), unit: '家', note: '完成基础配置', icon: CircleCheckBig, tone: 'green' },
    { label: '有效运行企业数', value: formatDisplayValue(available, activeCount), unit: '家', note: '近30日有有效记录', icon: TrendingUp, tone: 'violet' },
    { label: '隐患记录数', value: formatDisplayValue(available, state.overview.hazardTotal), unit: '条', note: '企业上报并归集', icon: ClipboardList, tone: 'orange' },
    { label: '已复查/销号数', value: formatDisplayValue(available, state.overview.fixedHazards), unit: '条', note: '完成复查或闭环', icon: BadgeCheck, tone: 'blue' },
    { label: '巡检记录数', value: formatDisplayValue(available, state.overview.patrolTotal), unit: '条', note: '实际归集记录', icon: SearchCheck, tone: 'green' },
    { label: '作业票记录数', value: formatDisplayValue(available, state.overview.permitTotal), unit: '条', note: '审批与归档记录', icon: FileText, tone: 'cyan' },
    { label: '培训参与人次', value: formatDisplayValue(available, state.overview.trainingPeople), unit: '人次', note: '参与培训或考试', icon: UsersRound, tone: 'violet' },
  ]

  return (
    <div className="pxv2-page-stack">
      <section className="pxv2-metric-band" aria-label="核心运行指标">
        {metrics.map(item => <MetricTile key={item.label} item={item} />)}
      </section>

      <section className="pxv2-chart-layout">
        <Panel title="隐患整改闭环趋势">
          <ScopeNote>按隐患上报月份统计；各状态取当前归集状态，不作为执法认定依据。</ScopeNote>
          {hazardTrend ? <><ChartLegend series={hazardTrend.series} /><LineChartSvg labels={hazardTrend.labels} series={hazardTrend.series} maxValue={Math.ceil(maxForSeries(hazardTrend.series) / 10) * 10} /></> : <EmptyVisual description="至少形成4个有效月份后展示趋势。" />}
        </Panel>

        <Panel title={planAvailable ? '巡检完成情况趋势' : '巡检记录与问题趋势'}>
          <ScopeNote>{planAvailable ? '完成率仅按已配置巡检计划和应完成次数计算。' : '当前未归集明确巡检计划与应完成次数，因此不计算完成率。'}</ScopeNote>
          {patrolTrend ? <><ChartLegend series={patrolTrend.series} /><LineChartSvg labels={patrolTrend.labels} series={patrolTrend.series} maxValue={Math.ceil(maxForSeries(patrolTrend.series) / 10) * 10} /></> : <EmptyVisual description="至少形成4个有效月份后展示趋势。" />}
        </Panel>

        <Panel title="企业运行状态分布" note="点击状态查看企业清单">
          {!available || totalCompanies === 0 ? <EmptyVisual /> : (
            <div className="pxv2-donut-layout">
              <div className="pxv2-donut" style={{ background: donutBackground }} aria-label="企业运行状态环形图"><div><strong>{totalCompanies}</strong><span>企业总数</span></div></div>
              <div className="pxv2-donut-legend is-clickable">
                {statusCounts.map((item, index) => (
                  <Link key={item.label} to={`/gov/pingxiang/companies?status=${encodeURIComponent(item.label)}`}>
                    <i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}家（{Math.round(statusPercentages[index])}%）</strong>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </section>

      <section className="pxv2-bottom-layout">
        <Panel title="近30日无新增有效记录企业" note="客观数据提示" action={<Link className="pxv2-panel-link-inline" to="/gov/pingxiang/companies">查看企业清单 <ChevronRight size={15} /></Link>}>
          {!available ? <EmptyVisual /> : attentionCompanies.length === 0 ? <EmptyVisual title="当前暂无需提示企业" description="已归集企业近30日内均形成有效记录。" /> : (
            <div className="pxv2-table-wrap">
              <table>
                <thead><tr><th>企业名称</th><th>所属行业</th><th>最近有效数据时间</th><th>提示原因</th></tr></thead>
                <tbody>{attentionCompanies.map(item => <tr key={item.company.company_id}><td>{item.company.company_name}</td><td>{item.company.industry}</td><td>{item.latestUpdate}</td><td>{item.latestUpdate === '暂无更新' ? '尚未形成有效记录' : '近30日无新增有效记录'}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <p className="pxv2-table-note">注：仅作项目运行提醒，具体情况以企业实际管理为准。</p>
        </Panel>

        <Panel title="数据更新与归集说明">
          <div className="pxv2-notice-list">
            <div><span className="blue"><Database size={19} /></span><p>{dataSourceText(state)}</p></div>
            <div><span className="violet"><ClipboardList size={19} /></span><p>隐患、巡检、作业票、培训等数据以企业端实际记录为准。</p></div>
            <div><span className="green"><SearchCheck size={19} /></span><p>如发现数据异常或缺失，可联系安巡数智项目服务人员核实。</p></div>
          </div>
          <div className="pxv2-update-time">最近有效数据时间：{available ? latestRecordTime(state.data) : '暂无数据'}</div>
        </Panel>
      </section>
    </div>
  )
}
