import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileBarChart,
  FileCheck2,
  FileText,
  GraduationCap,
  MapPin,
  RotateCcw,
  Search,
  SearchCheck,
  ShieldCheck,
  TicketCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  DataTable,
  EmptyVisual,
  LineChartSvg,
  MetricTile,
  PageTitle,
  Panel,
  ScopeNote,
  StatusPill,
  type VisualChartSeries,
  type VisualMetric,
} from './VisualComponents'
import {
  companyName,
  formatDisplayValue,
  isAbnormalPatrol,
  isClosedHazard,
  isDataAvailable,
  isPassedTraining,
  monthKey,
  monthLabel,
  recentMonthKeys,
  type PingxiangDataState,
} from './visualModel'

const EmptyRow = ({ columns, text = '暂无数据' }: { columns: number; text?: string }) => <tr><td className="pxv2-table-empty" colSpan={columns}>{text}</td></tr>

const SummaryMetrics = ({ metrics }: { metrics: VisualMetric[] }) => (
  <section className="pxv2-secondary-metrics">{metrics.map(item => <MetricTile key={item.label} item={item} />)}</section>
)

const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) => (
  <label className="pxv2-filter-field"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="全部">全部</option>{options.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
)

const recordMonths = (values: string[]) => recentMonthKeys(values)
const companyPageSize = 10

export function CompaniesPageV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const [searchParams, setSearchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const [industry, setIndustry] = useState('全部')
  const status = searchParams.get('status') || '全部'
  const industries = Array.from(new Set(state.companies.map(item => item.company.industry))).filter(Boolean)
  const rows = useMemo(() => state.companies.filter(item => {
    const keywordMatch = !keyword || item.company.company_name.includes(keyword)
    const industryMatch = industry === '全部' || item.company.industry === industry
    const statusMatch = status === '全部' || item.runningStatus === status
    return keywordMatch && industryMatch && statusMatch
  }), [industry, keyword, state.companies, status])
  const totalPages = Math.max(1, Math.ceil(rows.length / companyPageSize))
  const requestedPage = Number(searchParams.get('companyPage')) || 1
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages)
  const pagedRows = rows.slice((currentPage - 1) * companyPageSize, currentPage * companyPageSize)

  const updateSearch = (next: { status?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams)
    if (next.status === '全部') params.delete('status')
    else if (next.status) params.set('status', next.status)
    const nextPage = next.page ?? 1
    if (nextPage <= 1) params.delete('companyPage')
    else params.set('companyPage', String(nextPage))
    setSearchParams(params)
  }

  const reset = () => {
    setKeyword('')
    setIndustry('全部')
    setSearchParams({})
  }

  return (
    <div className="pxv2-page-stack">
      <PageTitle eyebrow="试点企业运行档案" title="企业清单" description="查看试点企业开通情况、四项功能记录和最近有效数据时间。" action={<span className="pxv2-count-chip">{available ? `共 ${rows.length} 家企业` : '暂无数据'}</span>} />
      <Panel title="查询条件" note="支持按企业、行业和运行状态筛选">
        <div className="pxv2-filter-bar">
          <label className="pxv2-filter-field pxv2-filter-search"><span>企业名称</span><div><Search size={17} /><input value={keyword} onChange={event => { setKeyword(event.target.value); updateSearch({ page: 1 }) }} placeholder="请输入企业名称" /></div></label>
          <FilterSelect label="所属行业" value={industry} onChange={value => { setIndustry(value); updateSearch({ page: 1 }) }} options={industries} />
          <FilterSelect label="运行状态" value={status} onChange={value => updateSearch({ status: value, page: 1 })} options={['近期有有效记录', '近期记录较少', '尚未形成有效记录']} />
          <button className="pxv2-secondary-button" type="button" onClick={reset}><RotateCcw size={16} />重置</button>
        </div>
      </Panel>
      <Panel title="企业运行清单" note="企业名称可进入只读运行档案">
        <DataTable headers={['企业名称', '所属行业', '开通状态', '运行状态', '隐患', '巡检', '作业票', '培训', '最近有效数据', '操作']} minWidth={1160}>
          {!available || rows.length === 0 ? <EmptyRow columns={10} /> : pagedRows.map(item => (
            <tr key={item.company.company_id}>
              <td><Link className="pxv2-table-link" to={`/gov/pingxiang/company/${item.company.company_id}`}>{item.company.company_name}</Link></td>
              <td>{item.company.industry || '暂无数据'}</td><td><StatusPill value={item.company.enabled ? '已开通' : '未开通'} /></td><td><StatusPill value={item.runningStatus} /></td>
              <td>{item.hazards.length}</td><td>{item.patrols.length}</td><td>{item.permits.length}</td><td>{item.trainings.length}</td><td>{item.latestUpdate}</td>
              <td><Link className="pxv2-detail-button" to={`/gov/pingxiang/company/${item.company.company_id}`}>查看详情</Link></td>
            </tr>
          ))}
        </DataTable>
        <div className="pxv2-pagination" aria-label="企业清单分页">
          <span>共 {rows.length} 家企业 · 每页 {companyPageSize} 家</span>
          <div>
            <button type="button" disabled={currentPage <= 1} onClick={() => updateSearch({ page: currentPage - 1 })}>上一页</button>
            <strong>第 {currentPage} / {totalPages} 页</strong>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => updateSearch({ page: currentPage + 1 })}>下一页</button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

type CompanyTab = 'hazards' | 'patrols' | 'permits' | 'training'

export function CompanyDetailPageV2({ state, companyId }: { state: PingxiangDataState; companyId: string }) {
  const [tab, setTab] = useState<CompanyTab>('hazards')
  const available = isDataAvailable(state)
  const item = state.companyMap.get(companyId)
  if (!available || !item) return <div className="pxv2-page-stack"><PageTitle eyebrow="企业运行档案" title="企业详情" description="查看企业四项功能运行记录。" /><EmptyVisual title="暂无企业数据" description="请返回企业清单重新选择。" /></div>

  const metrics: VisualMetric[] = [
    { label: '隐患记录', value: item.hazards.length, unit: '条', note: `未闭环 ${item.openHazards} 条`, icon: AlertTriangle, tone: 'orange' },
    { label: '巡检记录', value: item.patrols.length, unit: '条', note: `问题记录 ${item.abnormalPatrols} 条`, icon: SearchCheck, tone: 'green' },
    { label: '作业票记录', value: item.permits.length, unit: '条', note: '特殊作业留痕', icon: TicketCheck, tone: 'blue' },
    { label: '培训考试', value: item.trainings.length, unit: '人次', note: item.trainings.length ? `合格率 ${item.trainingPassRate}%` : '暂无考试记录', icon: GraduationCap, tone: 'violet' },
  ]

  return (
    <div className="pxv2-page-stack">
      <PageTitle eyebrow="企业清单 / 企业详情" title={item.company.company_name} description="企业四项闭环运行档案，仅展示已归集记录。" action={<Link className="pxv2-secondary-button" to="/gov/pingxiang/companies">返回企业清单</Link>} />
      <section className="pxv2-company-profile">
        <div><span><Building2 size={23} /></span><strong>{item.company.company_name}</strong><StatusPill value={item.runningStatus} /></div>
        <dl><div><dt>所属行业</dt><dd>{item.company.industry || '暂无数据'}</dd></div><div><dt>企业地址</dt><dd>{item.company.address || '暂无数据'}</dd></div><div><dt>联系人</dt><dd>{item.company.contact_name || '暂无数据'}</dd></div><div><dt>最近有效数据</dt><dd>{item.latestUpdate}</dd></div></dl>
      </section>
      <SummaryMetrics metrics={metrics} />
      <Panel title="最近运行记录" note="按四项功能切换查看">
        <div className="pxv2-tabs">{([['hazards', '隐患整改'], ['patrols', '巡检点检'], ['permits', '作业票管理'], ['training', '培训考试']] as Array<[CompanyTab, string]>).map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
        {tab === 'hazards' && <DataTable headers={['隐患名称', '等级', '状态', '责任人', '上报时间']}><>{item.hazards.length === 0 ? <EmptyRow columns={5} /> : item.hazards.slice(0, 8).map(row => <tr key={row.id}><td>{row.title}</td><td>{row.level}</td><td><StatusPill value={row.status} /></td><td>{row.responsible_person || '暂无数据'}</td><td>{row.reported_at || '暂无数据'}</td></tr>)}</></DataTable>}
        {tab === 'patrols' && <DataTable headers={['点位/设备', '巡检线路', '结果', '执行人', '时间']}><>{item.patrols.length === 0 ? <EmptyRow columns={5} /> : item.patrols.slice(0, 8).map(row => <tr key={row.id}><td>{row.checkpoint}</td><td>{row.route_name}</td><td><StatusPill value={row.status} /></td><td>{row.inspector || '暂无数据'}</td><td>{row.checked_at || '暂无数据'}</td></tr>)}</></DataTable>}
        {tab === 'permits' && <DataTable headers={['作业类型', '作业地点', '状态', '申请人', '提交时间']}><>{item.permits.length === 0 ? <EmptyRow columns={5} /> : item.permits.slice(0, 8).map(row => <tr key={row.id}><td>{row.permit_type}</td><td>{row.location}</td><td><StatusPill value={row.status} /></td><td>{row.applicant || '暂无数据'}</td><td>{row.submitted_at || '暂无数据'}</td></tr>)}</></DataTable>}
        {tab === 'training' && <DataTable headers={['培训主题', '参加人员', '完成状态', '考试结果', '完成时间']}><>{item.trainings.length === 0 ? <EmptyRow columns={5} /> : item.trainings.slice(0, 8).map(row => <tr key={row.id}><td>{row.course_name}</td><td>{row.person_name}</td><td><StatusPill value={row.status} /></td><td>{row.exam_result || '暂无数据'}</td><td>{row.completed_at || '暂无数据'}</td></tr>)}</></DataTable>}
      </Panel>
    </div>
  )
}

export function HazardsPageV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const rows = state.data.hazardRecords
  const closed = rows.filter(item => isClosedHazard(item.status)).length
  const rectifying = rows.filter(item => item.status.includes('整改中')).length
  const overdue = rows.filter(item => item.status.includes('超期')).length
  const metrics: VisualMetric[] = [
    { label: '隐患总数', value: formatDisplayValue(available, rows.length), unit: '条', note: '已成功归集', icon: AlertTriangle, tone: 'orange' },
    { label: '待整改', value: formatDisplayValue(available, rows.filter(item => item.status.includes('待整改')).length), unit: '条', note: '等待企业整改', icon: Clock3, tone: 'violet' },
    { label: '整改中', value: formatDisplayValue(available, rectifying), unit: '条', note: '正在推进整改', icon: ClipboardCheck, tone: 'blue' },
    { label: '已复查/闭环', value: formatDisplayValue(available, closed), unit: '条', note: '完成复查或销号', icon: BadgeCheck, tone: 'green' },
    { label: '超期未整改', value: formatDisplayValue(available, overdue), unit: '条', note: '按整改期限识别', icon: AlertTriangle, tone: 'orange' },
  ]
  const periods = recordMonths(rows.map(item => item.reported_at))
  const trend: VisualChartSeries[] = [
    { label: '上报数', color: '#1677ff', values: periods.map(period => rows.filter(item => monthKey(item.reported_at) === period).length) },
    { label: '已闭环', color: '#45ad65', values: periods.map(period => rows.filter(item => monthKey(item.reported_at) === period && isClosedHazard(item.status)).length) },
  ]

  return (
    <div className="pxv2-page-stack">
      <PageTitle eyebrow="四项闭环运行" title="隐患整改" description="展示隐患上报、整改、复查和销号过程，政府端仅作只读查看。" />
      <SummaryMetrics metrics={metrics} />
      <section className="pxv2-analysis-grid"><Panel title="隐患闭环趋势"><ScopeNote>按隐患上报月份统计，闭环数量取当前归集状态。</ScopeNote>{available && periods.length >= 2 ? <LineChartSvg labels={periods.map(monthLabel)} series={trend} maxValue={Math.max(5, ...trend.flatMap(item => item.values))} /> : <EmptyVisual />}</Panel><Panel title="隐患状态分布"><div className="pxv2-status-bars">{['待整改', '整改中', '已整改', '已复查', '超期未整改'].map(status => { const count = rows.filter(item => item.status.includes(status)).length; return <div key={status}><span>{status}</span><i><b style={{ width: `${rows.length ? count / rows.length * 100 : 0}%` }} /></i><strong>{available ? count : '暂无数据'}</strong></div> })}</div></Panel></section>
      <Panel title="隐患记录" note="只读数据，不提供整改或执法操作"><DataTable headers={['企业名称', '隐患名称', '等级', '状态', '责任人', '整改期限', '上报时间']} minWidth={1040}>{!available || rows.length === 0 ? <EmptyRow columns={7} /> : rows.map(item => <tr key={item.id}><td>{companyName(state.companies, item.company_id)}</td><td>{item.title}</td><td>{item.level}</td><td><StatusPill value={item.status} /></td><td>{item.responsible_person || '暂无数据'}</td><td>{item.deadline || '暂无数据'}</td><td>{item.reported_at || '暂无数据'}</td></tr>)}</DataTable></Panel>
    </div>
  )
}

export function PatrolsPageV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const rows = state.data.patrolRecords
  const abnormal = rows.filter(item => isAbnormalPatrol(item.status)).length
  const periods = recordMonths(rows.map(item => item.checked_at))
  const trend: VisualChartSeries[] = [
    { label: '巡检记录', color: '#1677ff', values: periods.map(period => rows.filter(item => monthKey(item.checked_at) === period).length) },
    { label: '问题记录', color: '#f07639', values: periods.map(period => rows.filter(item => monthKey(item.checked_at) === period && isAbnormalPatrol(item.status)).length) },
  ]
  const metrics: VisualMetric[] = [
    { label: '巡检记录数', value: formatDisplayValue(available, rows.length), unit: '条', note: '实际归集记录', icon: SearchCheck, tone: 'blue' },
    { label: '正常记录', value: formatDisplayValue(available, rows.length - abnormal), unit: '条', note: '结果为正常', icon: CheckCircle2, tone: 'green' },
    { label: '问题记录', value: formatDisplayValue(available, abnormal), unit: '条', note: '异常或漏检记录', icon: AlertTriangle, tone: 'orange' },
    { label: '完成率', value: null, note: '未归集明确计划口径', icon: BadgeCheck, tone: 'slate' },
  ]
  return <div className="pxv2-page-stack"><PageTitle eyebrow="四项闭环运行" title="巡检点检" description="展示企业实际巡检、扫码点检和发现问题记录。" /><SummaryMetrics metrics={metrics} /><Panel title="巡检记录与问题趋势"><ScopeNote>当前接口未归集明确巡检计划和应完成次数，因此不计算完成率。</ScopeNote>{available && periods.length >= 2 ? <LineChartSvg labels={periods.map(monthLabel)} series={trend} maxValue={Math.max(5, ...trend.flatMap(item => item.values))} /> : <EmptyVisual />}</Panel><Panel title="巡检记录" note="完成率待具备明确计划口径后启用"><DataTable headers={['企业名称', '点位/设备', '巡检线路', '巡检结果', '执行人', '执行时间']} minWidth={980}>{!available || rows.length === 0 ? <EmptyRow columns={6} /> : rows.map(item => <tr key={item.id}><td>{companyName(state.companies, item.company_id)}</td><td>{item.checkpoint}</td><td>{item.route_name}</td><td><StatusPill value={item.status} /></td><td>{item.inspector || '暂无数据'}</td><td>{item.checked_at || '暂无数据'}</td></tr>)}</DataTable></Panel></div>
}

export function WorkPermitsPageV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const rows = state.data.workPermitRecords
  const completed = rows.filter(item => item.status.includes('完成') || item.status.includes('通过')).length
  const types = ['动火', '有限空间', '高处', '临时用电']
  const metrics: VisualMetric[] = [
    { label: '作业票记录', value: formatDisplayValue(available, rows.length), unit: '条', note: '实际归集记录', icon: TicketCheck, tone: 'blue' },
    { label: '审批中', value: formatDisplayValue(available, rows.filter(item => item.status.includes('审批')).length), unit: '条', note: '流程处理中', icon: Clock3, tone: 'violet' },
    { label: '已通过/归档', value: formatDisplayValue(available, completed), unit: '条', note: '完成审批或归档', icon: FileCheck2, tone: 'green' },
    { label: '特殊作业类型', value: formatDisplayValue(available, new Set(rows.map(item => item.permit_type)).size), unit: '类', note: '当前归集类型', icon: FileText, tone: 'orange' },
  ]
  return <div className="pxv2-page-stack"><PageTitle eyebrow="四项闭环运行" title="作业票管理" description="展示特殊作业申请、审批留痕和归档记录，政府端不承担审批。" /><SummaryMetrics metrics={metrics} /><section className="pxv2-type-strip">{types.map(type => <div key={type}><span><TicketCheck size={20} /></span><strong>{type}作业</strong><em>{available ? `${rows.filter(item => item.permit_type.includes(type)).length} 条记录` : '暂无数据'}</em></div>)}</section><Panel title="作业票记录" note="只读查看审批和归档留痕"><DataTable headers={['企业名称', '作业类型', '作业地点', '当前状态', '申请人', '提交时间']} minWidth={960}>{!available || rows.length === 0 ? <EmptyRow columns={6} /> : rows.map(item => <tr key={item.id}><td>{companyName(state.companies, item.company_id)}</td><td>{item.permit_type}</td><td>{item.location || '暂无数据'}</td><td><StatusPill value={item.status} /></td><td>{item.applicant || '暂无数据'}</td><td>{item.submitted_at || '暂无数据'}</td></tr>)}</DataTable></Panel></div>
}

export function TrainingPageV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const rows = state.data.trainingRecords
  const completed = rows.filter(item => item.status.includes('完成')).length
  const passed = rows.filter(item => isPassedTraining(item.exam_result)).length
  const metrics: VisualMetric[] = [
    { label: '培训参与人次', value: formatDisplayValue(available, rows.length), unit: '人次', note: '实际归集记录', icon: UsersRound, tone: 'violet' },
    { label: '已完成人次', value: formatDisplayValue(available, completed), unit: '人次', note: '完成培训或考试', icon: BookOpenCheck, tone: 'green' },
    { label: '考试合格人次', value: formatDisplayValue(available, passed), unit: '人次', note: '结果标记为合格', icon: BadgeCheck, tone: 'blue' },
    { label: '合格率', value: available && rows.length ? Math.round(passed / rows.length * 100) : null, unit: '%', note: rows.length ? '按已归集考试结果计算' : '暂无统一考试结果', icon: GraduationCap, tone: 'orange' },
  ]
  return <div className="pxv2-page-stack"><PageTitle eyebrow="四项闭环运行" title="培训考试" description="展示安全培训参与、完成情况和已归集考试结果。" /><SummaryMetrics metrics={metrics} /><section className="pxv2-analysis-grid"><Panel title="完成情况"><div className="pxv2-progress-summary"><div><strong>{available ? completed : '暂无数据'}</strong><span>已完成人次</span></div><i><b style={{ width: `${rows.length ? completed / rows.length * 100 : 0}%` }} /></i><p>{rows.length ? `共归集 ${rows.length} 人次` : '暂无培训记录'}</p></div></Panel><Panel title="考试结果说明"><ScopeNote>合格率仅在考试结果字段口径统一时计算；缺失结果不计为合格。</ScopeNote><div className="pxv2-result-grid"><div><span className="green" /><strong>{available ? passed : '暂无数据'}</strong><p>合格</p></div><div><span className="orange" /><strong>{available ? rows.length - passed : '暂无数据'}</strong><p>其他结果</p></div></div></Panel></section><Panel title="培训考试记录"><DataTable headers={['企业名称', '培训主题', '参加人员', '完成状态', '考试结果', '成绩', '完成时间']} minWidth={1040}>{!available || rows.length === 0 ? <EmptyRow columns={7} /> : rows.map(item => <tr key={item.id}><td>{companyName(state.companies, item.company_id)}</td><td>{item.course_name}</td><td>{item.person_name}</td><td><StatusPill value={item.status} /></td><td>{item.exam_result || '暂无数据'}</td><td>{item.score ?? '暂无数据'}</td><td>{item.completed_at || '暂无数据'}</td></tr>)}</DataTable></Panel></div>
}

const reports = [
  ['2026年7月试点运行月报', '2026-07-01 至 2026-07-31', '2026-07-20 10:30', '首批试点企业7月运行情况'],
  ['2026年6月试点运行月报', '2026-06-01 至 2026-06-30', '2026-07-05 09:30', '首批试点企业6月运行情况'],
  ['近90日试点运行阶段报告', '2026-05-01 至 2026-07-31', '2026-07-20 10:30', '试点阶段运行趋势与归集说明'],
]

export function ReportsPageV2({ state }: { state: PingxiangDataState }) {
  const [type, setType] = useState('月度报告')
  const visibleReports = state.mode === 'demo' ? reports.filter(item => type === '月度报告' ? item[0].includes('月报') : type === '阶段报告' ? item[0].includes('阶段') : item[0].includes('年度')) : []
  const downloadReport = (name: string) => {
    const content = `${name}\n\n本文件为内部演示环境生成的报告样例。\n实际报告以项目核验和归集数据为准。`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${name}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }
  return <div className="pxv2-page-stack"><PageTitle eyebrow="项目成果输出" title="阶段报告" description="汇总月度、阶段和年度运行成果，形成可查看、可下载的项目材料。" /><div className="pxv2-report-tabs">{['月度报告', '阶段报告', '年度报告'].map(item => <button className={type === item ? 'active' : ''} onClick={() => setType(item)} key={item}>{item}</button>)}</div><Panel title={type} note="报告内容以归集数据和项目核验结果为准"><DataTable headers={['报告名称', '报告时间范围', '生成时间', '说明', '操作']} minWidth={920}>{visibleReports.length === 0 ? <EmptyRow columns={5} text="当前环境暂无已生成报告" /> : visibleReports.map(item => <tr key={item[0]}><td><FileBarChart size={17} className="pxv2-inline-icon" />{item[0]}</td><td>{item[1]}</td><td>{item[2]}</td><td>{item[3]}</td><td><button className="pxv2-detail-button" type="button" onClick={() => downloadReport(item[0])}><Download size={15} />下载</button></td></tr>)}</DataTable></Panel><Panel title="报告说明"><div className="pxv2-report-note"><p>1. 报告基于企业实际记录及项目归集数据形成。</p><p>2. 加载和配置可能影响数据完整程度，报告会标明数据截止时间。</p><p>3. 报告用于项目运行复盘，不替代企业安全管理和监管执法判断。</p></div></Panel></div>
}

export function ProjectAboutPageV2() {
  return <div className="pxv2-page-stack"><PageTitle eyebrow="试点项目说明" title="项目介绍" description="平乡县企业安全管理四项闭环数字化试点项目。" /><section className="pxv2-about-grid"><Panel title="项目目标"><p className="pxv2-prose">围绕隐患整改、巡检点检、作业票和培训考试四项现场安全管理动作，形成可归集、可追溯、可复盘的县域试点运行数据。</p></Panel><Panel title="数据边界"><p className="pxv2-prose">平台数据来源于企业端实际记录及项目归集数据，主要用于了解试点运行情况，不替代企业安全管理，也不作为监管执法认定依据。</p></Panel><Panel title="技术支持"><div className="pxv2-support-card"><ShieldCheck size={25} /><div><strong>安巡数智科技有限公司</strong><span>项目实施与平台技术支持</span></div></div></Panel></section></div>
}
