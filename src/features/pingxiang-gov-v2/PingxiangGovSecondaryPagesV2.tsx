import {
  AlertTriangle,
  ArrowUpDown,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileBarChart,
  FileCheck2,
  FileText,
  GraduationCap,
  Landmark,
  RotateCcw,
  Search,
  SearchCheck,
  ShieldCheck,
  TicketCheck,
  UsersRound,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { HazardRecord, PatrolRecord, TrainingRecord, WorkPermitRecord } from '../pingxiang-gov/types'
import {
  buildQueryHref,
  DetailSection,
  EvidenceGallery,
  InfoGrid,
  Pager,
  ProcessTimeline,
  SourceFilterTags,
  WideDrawer,
} from './BusinessComponents'
import { InteractiveTrendChart } from './InteractiveTrendChart'
import {
  BusinessRecordDrawer,
  businessBasePath,
  businessKindLabel,
  findBusinessRecord,
  type BusinessKind,
} from './RecordDetailsV2'
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
  demoPeriods,
  isAbnormalPatrol,
  isClosedHazard,
  isDataAvailable,
  monthKey,
  monthLabel,
  trainingParticipantCount,
  unifiedBusinessRecords,
  type PingxiangDataState,
} from './visualModel'

const EmptyRow = ({ columns, text = '当前筛选暂无记录' }: { columns: number; text?: string }) => <tr><td className="pxv2-table-empty" colSpan={columns}>{text}</td></tr>

const FilterSelect = ({ label, name, value, options, onChange, optionLabel }: { label: string; name: string; value: string; options: string[]; onChange: (name: string, value: string) => void; optionLabel?: (value: string) => string }) => (
  <label className="pxv2-filter-field"><span>{label}</span><select value={value} onChange={event => onChange(name, event.target.value)}><option value="全部">全部</option>{options.map(item => <option key={item} value={item}>{optionLabel ? optionLabel(item) : item}</option>)}</select></label>
)

const FilterInput = ({ label, name, value, placeholder, type = 'text', onChange }: { label: string; name: string; value: string; placeholder: string; type?: string; onChange: (name: string, value: string) => void }) => (
  <label className={`pxv2-filter-field ${type === 'text' ? 'pxv2-filter-search' : ''}`}><span>{label}</span><div>{type === 'text' && <Search size={17} />}<input type={type} value={value} onChange={event => onChange(name, event.target.value)} placeholder={placeholder} /></div></label>
)

const SummaryMetrics = ({ metrics }: { metrics: VisualMetric[] }) => <section className="pxv2-secondary-metrics">{metrics.map(item => <MetricTile key={item.label} item={item} />)}</section>

const useUrlFilters = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const update = (name: string, value: string | number | null, resetPage = true) => {
    const updates: Record<string, string | number | null> = { [name]: value }
    if (resetPage) updates.page = null
    navigate(buildQueryHref(location.pathname, location.search, updates))
  }
  return { location, params, update, reset: () => navigate(location.pathname) }
}

const dateInRange = (value: string, from: string, to: string) => (!from || value.slice(0, 10) >= from) && (!to || value.slice(0, 10) <= to)
const textIncludes = (value: string | undefined, keyword: string) => !keyword || String(value || '').toLowerCase().includes(keyword.toLowerCase())

export function CompanyQuickDrawer({ state, companyId, fromHref }: { state: PingxiangDataState; companyId: string; fromHref: string }) {
  const item = state.companyMap.get(companyId)
  if (!item) return null
  const recent = unifiedBusinessRecords(state.data).filter(record => record.companyId === companyId).slice(0, 5)
  const participants = item.trainings.flatMap(record => record.participants || [])
  return (
    <WideDrawer title={item.company.company_name} enterprise={item.company.industry} status={item.runningStatus} time={item.latestUpdate} fullHref={`/gov/pingxiang/companies/${companyId}?from=${encodeURIComponent(fromHref)}`}>
      <DetailSection title="企业基础信息"><InfoGrid items={[
        { label: '企业名称', value: item.company.company_name }, { label: '所属行业', value: item.company.industry },
        { label: '项目状态', value: item.company.enabled ? '已开通' : '待开通' }, { label: '开通时间', value: item.company.enabled_at },
        { label: '联系人', value: item.company.contact_name }, { label: '联系电话', value: item.company.contact_phone },
        { label: '企业地址', value: item.company.address }, { label: '最近有效记录', value: item.latestUpdate },
      ]} /></DetailSection>
      <DetailSection title="四项业务摘要"><div className="pxv21-summary-strip"><span><AlertTriangle />隐患<strong>{item.hazards.length}</strong>条<small>未闭环 {item.openHazards}</small></span><span><SearchCheck />巡检<strong>{item.patrols.length}</strong>条<small>发现问题 {item.abnormalPatrols}</small></span><span><TicketCheck />作业票<strong>{item.permits.length}</strong>张</span><span><UsersRound />培训<strong>{participants.length}</strong>人次<small>合格率 {item.trainingPassRate}%</small></span></div></DetailSection>
      <DetailSection title="最近运行记录" note="可继续打开对应记录详情"><div className="pxv21-recent-list">{recent.map(record => <Link key={`${record.kind}-${record.id}`} to={record.href}><StatusPill value={record.kind} /><span><strong>{record.title}</strong><small>{record.time} · {record.person}</small></span><StatusPill value={record.status} /></Link>)}</div></DetailSection>
      <DetailSection title="业务入口"><div className="pxv21-action-grid"><Link to={`/gov/pingxiang/hazards?company=${companyId}`}>隐患记录</Link><Link to={`/gov/pingxiang/inspections?company=${companyId}`}>巡检记录</Link><Link to={`/gov/pingxiang/work-permits?company=${companyId}`}>作业票记录</Link><Link to={`/gov/pingxiang/trainings?company=${companyId}`}>培训记录</Link></div></DetailSection>
    </WideDrawer>
  )
}

export function CompaniesPageV2({ state }: { state: PingxiangDataState }) {
  const available = isDataAvailable(state)
  const navigate = useNavigate()
  const { location, params, update, reset } = useUrlFilters()
  const keyword = params.get('q') || ''
  const industry = params.get('industry') || '全部'
  const enabled = params.get('enabled') || '全部'
  const status = params.get('status') || '全部'
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const sort = params.get('sort') || 'latest'
  const order = params.get('order') || 'desc'
  const pageSize = Number(params.get('pageSize')) === 20 ? 20 : 10
  const page = Math.max(1, Number(params.get('companyPage')) || 1)
  const industries = Array.from(new Set(state.companies.map(item => item.company.industry))).filter(Boolean)
  const rows = useMemo(() => {
    const filtered = state.companies.filter(item => textIncludes(item.company.company_name, keyword)
      && (industry === '全部' || item.company.industry === industry)
      && (enabled === '全部' || (enabled === '已开通') === item.company.enabled)
      && (status === '全部' || item.runningStatus === status)
      && dateInRange(item.latestUpdate === '暂无更新' ? '' : item.latestUpdate, from, to))
    return [...filtered].sort((a, b) => {
      const aValue = sort === 'hazards' ? a.hazards.length : sort === 'patrols' ? a.patrols.length : a.latestUpdate
      const bValue = sort === 'hazards' ? b.hazards.length : sort === 'patrols' ? b.patrols.length : b.latestUpdate
      return (aValue > bValue ? 1 : aValue < bValue ? -1 : 0) * (order === 'asc' ? 1 : -1)
    })
  }, [enabled, from, industry, keyword, order, sort, state.companies, status, to])
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const preview = params.get('preview')
  const toggleSort = (nextSort: string) => {
    navigate(buildQueryHref(location.pathname, location.search, { sort: nextSort, order: sort === nextSort && order === 'desc' ? 'asc' : 'desc' }))
  }

  return (
    <div className="pxv2-page-stack">
      <PageTitle eyebrow="试点企业运行档案" title="企业清单" description="按开通状态、运行状态和最近有效记录快速定位试点企业。" action={<span className="pxv2-count-chip">{available ? `共 ${rows.length} 家企业` : '暂无数据'}</span>} />
      <SourceFilterTags labels={{ source: '来源', status: '运行状态', enabled: '开通状态', month: '统计月份' }} />
      <Panel title="查询条件" note="筛选、排序和分页状态会保留在当前地址">
        <div className="pxv2-filter-bar pxv21-filter-grid">
          <FilterInput label="企业名称" name="q" value={keyword} placeholder="输入企业名称" onChange={update} />
          <FilterSelect label="所属行业" name="industry" value={industry} options={industries} onChange={update} />
          <FilterSelect label="开通状态" name="enabled" value={enabled} options={['已开通', '待开通']} onChange={update} />
          <FilterSelect label="运行状态" name="status" value={status} options={['近期有有效记录', '近期记录较少', '尚未形成有效记录']} onChange={update} />
          <FilterInput label="最近记录起始" name="from" value={from} placeholder="开始日期" type="date" onChange={update} />
          <FilterInput label="最近记录结束" name="to" value={to} placeholder="结束日期" type="date" onChange={update} />
          <button className="pxv2-secondary-button" type="button" onClick={reset}><RotateCcw size={16} />重置</button>
        </div>
      </Panel>
      <Panel title="企业运行清单" note="企业名称过长时悬浮可查看全文" action={<label className="pxv21-page-size">每页<select value={pageSize} onChange={event => update('pageSize', event.target.value)}><option value="10">10条</option><option value="20">20条</option></select></label>}>
        <DataTable headers={['企业名称', '所属行业', '开通状态', '运行状态', '最近有效记录', '隐患数', '巡检数', '作业票数', '培训人次', '操作']} minWidth={1260}>
          {!available || !paged.length ? <EmptyRow columns={10} /> : paged.map(item => {
            const participants = item.trainings.reduce((sum, record) => sum + (record.participants?.length || 1), 0)
            const previewHref = buildQueryHref(location.pathname, location.search, { preview: item.company.company_id })
            return <tr key={item.company.company_id}>
              <td><Link className="pxv2-table-link pxv21-ellipsis" title={item.company.company_name} to={`/gov/pingxiang/companies/${item.company.company_id}`}>{item.company.company_name}</Link></td>
              <td><span className="pxv21-ellipsis" title={item.company.industry}>{item.company.industry}</span></td>
              <td><StatusPill value={item.company.enabled ? '已开通' : '待开通'} /></td><td><StatusPill value={item.runningStatus} /></td>
              <td><button className="pxv21-sort-link" type="button" onClick={() => toggleSort('latest')}>{item.latestUpdate}<ArrowUpDown size={13} /></button></td>
              <td><button className="pxv21-sort-link" type="button" onClick={() => toggleSort('hazards')}>{item.hazards.length}<ArrowUpDown size={13} /></button></td>
              <td><button className="pxv21-sort-link" type="button" onClick={() => toggleSort('patrols')}>{item.patrols.length}<ArrowUpDown size={13} /></button></td><td>{item.permits.length}</td><td>{participants}</td>
              <td><div className="pxv21-row-actions"><Link to={previewHref} state={{ drawer: true }}>快速查看</Link><Link to={`/gov/pingxiang/companies/${item.company.company_id}`}>进入详情</Link></div></td>
            </tr>
          })}
        </DataTable>
        {!paged.length && <div className="pxv21-empty-action"><button type="button" onClick={reset}>清除筛选</button></div>}
        <Pager page={currentPage} totalPages={totalPages} total={rows.length} pageSize={pageSize} onPage={next => update('companyPage', next, false)} />
      </Panel>
      {preview && <CompanyQuickDrawer state={state} companyId={preview} fromHref={`${location.pathname}${location.search}`} />}
    </div>
  )
}

export function CompanyDetailPageV2({ state, companyId }: { state: PingxiangDataState; companyId: string }) {
  const item = state.companyMap.get(companyId)
  const navigate = useNavigate()
  if (!item) return <div className="pxv2-page-stack"><PageTitle eyebrow="企业运行档案" title="企业详情" description="查看企业四项功能运行记录。" /><EmptyVisual title="暂无企业数据" description="请返回企业清单重新选择。" action={<Link to="/gov/pingxiang/companies">返回企业清单</Link>} /></div>
  const participants = item.trainings.flatMap(record => record.participants || [])
  const metrics: VisualMetric[] = [
    { label: '隐患记录', value: item.hazards.length, unit: '条', note: `未闭环 ${item.openHazards} 条`, icon: AlertTriangle, tone: 'orange', href: `/gov/pingxiang/hazards?company=${companyId}` },
    { label: '巡检记录', value: item.patrols.length, unit: '条', note: `发现问题 ${item.abnormalPatrols} 条`, icon: SearchCheck, tone: 'green', href: `/gov/pingxiang/inspections?company=${companyId}` },
    { label: '作业票记录', value: item.permits.length, unit: '张', note: '审批及归档记录', icon: TicketCheck, tone: 'blue', href: `/gov/pingxiang/work-permits?company=${companyId}` },
    { label: '培训参与', value: participants.length, unit: '人次', note: `合格率 ${item.trainingPassRate}%`, icon: GraduationCap, tone: 'violet', href: `/gov/pingxiang/trainings?company=${companyId}` },
  ]
  const series: VisualChartSeries[] = [
    { label: '隐患', color: '#f07639', values: demoPeriods.map(period => item.hazards.filter(record => monthKey(record.reported_at) === period).length) },
    { label: '巡检', color: '#1677ff', values: demoPeriods.map(period => item.patrols.filter(record => monthKey(record.checked_at) === period).length) },
    { label: '作业票', color: '#7b4ce2', values: demoPeriods.map(period => item.permits.filter(record => monthKey(record.submitted_at) === period).length) },
    { label: '培训', color: '#45ad65', values: demoPeriods.map(period => item.trainings.filter(record => monthKey(record.started_at || record.completed_at) === period).length) },
  ]
  const recent = unifiedBusinessRecords(state.data).filter(record => record.companyId === companyId).slice(0, 10)
  return <div className="pxv2-page-stack">
    <PageTitle eyebrow="企业完整运行档案" title={item.company.company_name} description="先看企业运行状态，再追溯四项业务过程记录。" action={<Link className="pxv2-secondary-button" to="/gov/pingxiang/companies">返回企业清单</Link>} />
    <Panel title="企业概览"><div className="pxv2-company-profile"><div className="pxv21-company-profile-head"><span><Building2 size={22} /></span><div><small>企业基础信息</small><h2>{item.company.company_name}</h2><p>{item.company.industry} · {item.company.address}</p></div></div><InfoGrid items={[{ label: '运行状态', value: <StatusPill value={item.runningStatus} /> }, { label: '最近有效记录', value: item.latestUpdate }, { label: '联系人', value: item.company.contact_name }, { label: '联系电话', value: item.company.contact_phone }]} /></div></Panel>
    <SummaryMetrics metrics={metrics} />
    <Panel title="近6个月四项业务趋势" note="悬浮查看同月全部数据，点击进入对应月份业务清单"><InteractiveTrendChart labels={demoPeriods.map(monthLabel)} periods={demoPeriods} series={series} maxValue={Math.max(4, ...series.flatMap(value => value.values))} onPointClick={(period, label) => navigate(`${label === '隐患' ? '/gov/pingxiang/hazards' : label === '巡检' ? '/gov/pingxiang/inspections' : label === '作业票' ? '/gov/pingxiang/work-permits' : '/gov/pingxiang/trainings'}?company=${companyId}&month=${period}&source=企业详情趋势`)} /></Panel>
    <Panel title="最近运行记录" note="点击记录进入完整业务详情"><div className="pxv21-recent-list is-table">{recent.map(record => <Link key={`${record.kind}-${record.id}`} to={record.href}><StatusPill value={record.kind} /><span><strong>{record.title}</strong><small>{record.time} · {record.person}</small></span><StatusPill value={record.status} /></Link>)}</div></Panel>
    <Panel title="数据说明"><ScopeNote>当前为演示环境；数据来源、更新时间和统计结果均由同一套前端演示数据模型派生，不作为执法认定依据。</ScopeNote></Panel>
  </div>
}

const kindRecords = (state: PingxiangDataState, kind: BusinessKind) => kind === 'hazard' ? state.data.hazardRecords : kind === 'inspection' ? state.data.patrolRecords : kind === 'permit' ? state.data.workPermitRecords : state.data.trainingRecords
const recordDate = (kind: BusinessKind, record: HazardRecord | PatrolRecord | WorkPermitRecord | TrainingRecord) => kind === 'hazard' ? (record as HazardRecord).reported_at : kind === 'inspection' ? (record as PatrolRecord).checked_at : kind === 'permit' ? (record as WorkPermitRecord).submitted_at : (record as TrainingRecord).started_at || (record as TrainingRecord).completed_at
const recordPerson = (kind: BusinessKind, record: HazardRecord | PatrolRecord | WorkPermitRecord | TrainingRecord) => kind === 'hazard' ? (record as HazardRecord).reporter || (record as HazardRecord).responsible_person : kind === 'inspection' ? (record as PatrolRecord).inspector : kind === 'permit' ? (record as WorkPermitRecord).applicant : (record as TrainingRecord).person_name

function BusinessListPage({ state, kind }: { state: PingxiangDataState; kind: BusinessKind }) {
  const available = isDataAvailable(state)
  const { location, params, update, reset } = useUrlFilters()
  const company = params.get('company') || '全部'
  const status = params.get('status') || '全部'
  const month = params.get('month') || ''
  const q = params.get('q') || ''
  const person = params.get('person') || ''
  const level = params.get('level') || '全部'
  const result = params.get('result') || '全部'
  const type = params.get('type') || '全部'
  const overdue = params.get('overdue') || '全部'
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageSize = 10
  const records = kindRecords(state, kind) as Array<HazardRecord | PatrolRecord | WorkPermitRecord | TrainingRecord>
  const rows = records.filter(record => {
    const date = recordDate(kind, record)
    const recordText = kind === 'hazard' ? `${(record as HazardRecord).title} ${(record as HazardRecord).description}` : kind === 'inspection' ? `${(record as PatrolRecord).checkpoint} ${(record as PatrolRecord).route_name}` : kind === 'permit' ? `${(record as WorkPermitRecord).permit_type} ${(record as WorkPermitRecord).location}` : `${(record as TrainingRecord).title} ${(record as TrainingRecord).course_name}`
    const common = (company === '全部' || record.company_id === company) && (status === '全部' || record.status === status) && (!month || monthKey(date) === month) && dateInRange(date, from, to) && textIncludes(`${record.id} ${recordPerson(kind, record)} ${companyName(state.companies, record.company_id)} ${recordText}`, q || person)
    if (!common) return false
    if (kind === 'hazard') {
      const item = record as HazardRecord
      return (level === '全部' || item.level === level) && (overdue === '全部' || (overdue === '是') === item.status.includes('超期'))
    }
    if (kind === 'inspection') return result === '全部' || (result === '存在异常' ? isAbnormalPatrol(record.status) : record.status === result)
    if (kind === 'permit') return type === '全部' || (record as WorkPermitRecord).permit_type === type
    const training = record as TrainingRecord
    return type === '全部' || training.title === type || training.course_name === type
  })
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const preview = params.get('preview')
  const previewRecord = preview ? findBusinessRecord(state, kind, preview) : undefined
  const companies = state.companies.map(item => item.company.company_id)
  const companyOptions = companies
  const title = kind === 'hazard' ? '隐患整改' : kind === 'inspection' ? '巡检点检' : kind === 'permit' ? '作业票管理' : '培训考试'
  const description = kind === 'hazard' ? '追踪隐患从上报、分派、整改到复查销号的完整过程。' : kind === 'inspection' ? '查看现场点位检查结果、问题项和关联隐患。' : kind === 'permit' ? '查看作业申请、安全措施、审批链和完工确认。' : '查看培训计划、参与名单、学习完成和考试结果。'
  const metricRows: VisualMetric[] = kind === 'hazard' ? [
    { label: '隐患总数', value: rows.length, unit: '条', note: '当前筛选结果', icon: AlertTriangle, tone: 'orange' },
    { label: '未闭环', value: rows.filter(item => !isClosedHazard(item.status)).length, unit: '条', note: '仍需继续跟进', icon: ClipboardCheck, tone: 'violet' },
    { label: '已销号', value: rows.filter(item => item.status.includes('销号')).length, unit: '条', note: '完成闭环归档', icon: BadgeCheck, tone: 'green' },
    { label: '逾期', value: rows.filter(item => item.status.includes('超期')).length, unit: '条', note: '超过整改期限', icon: CalendarDays, tone: 'orange' },
  ] : kind === 'inspection' ? [
    { label: '巡检记录', value: rows.length, unit: '条', note: '当前筛选结果', icon: SearchCheck, tone: 'blue' },
    { label: '正常记录', value: rows.filter(item => !isAbnormalPatrol(item.status)).length, unit: '条', note: '未发现问题', icon: CheckCircle2, tone: 'green' },
    { label: '问题记录', value: rows.filter(item => isAbnormalPatrol(item.status)).length, unit: '条', note: '异常或漏检', icon: AlertTriangle, tone: 'orange' },
  ] : kind === 'permit' ? [
    { label: '作业票', value: rows.length, unit: '张', note: '当前筛选结果', icon: TicketCheck, tone: 'blue' },
    { label: '待审批', value: rows.filter(item => item.status.includes('审批')).length, unit: '张', note: '等待审批处理', icon: FileCheck2, tone: 'violet' },
    { label: '已完工', value: rows.filter(item => item.status === '已完成').length, unit: '张', note: '完成确认归档', icon: BadgeCheck, tone: 'green' },
  ] : [
    { label: '培训活动', value: rows.length, unit: '场', note: '当前筛选结果', icon: GraduationCap, tone: 'blue' },
    { label: '参与人次', value: (rows as TrainingRecord[]).reduce((sum, record) => sum + (record.participants?.length || 0), 0), unit: '人次', note: '参与培训人员', icon: UsersRound, tone: 'violet' },
    { label: '已完成', value: rows.filter(item => item.status === '已完成').length, unit: '场', note: '已形成结果', icon: BadgeCheck, tone: 'green' },
  ]
  const statusOptions = kind === 'hazard' ? ['待整改', '整改中', '待复查', '已销号', '超期未整改'] : kind === 'inspection' ? ['正常', '异常', '漏检'] : kind === 'permit' ? ['待审批', '已通过', '已驳回', '已完成'] : ['进行中', '已完成', '未完成']
  const typeOptions = kind === 'permit' ? Array.from(new Set(state.data.workPermitRecords.map(item => item.permit_type))) : kind === 'training' ? Array.from(new Set(state.data.trainingRecords.map(item => item.title || item.course_name))) : []
  const companyLabel = (id: string) => companyName(state.companies, id)
  const previewHref = (id: string) => buildQueryHref(location.pathname, location.search, { preview: id })

  return <div className="pxv2-page-stack">
    <PageTitle eyebrow="四项功能运行记录" title={title} description={description} action={<span className="pxv2-count-chip">{available ? `共 ${rows.length} 条` : '暂无数据'}</span>} />
    <SourceFilterTags labels={{ source: '来源', company: '企业', month: '统计月份', status: '状态', result: '检查结果' }} values={{ company: company === '全部' ? '' : companyLabel(company) }} />
    <SummaryMetrics metrics={metricRows.map(item => ({ ...item, value: available ? item.value : null }))} />
    <Panel title="筛选与检索" note="筛选条件、页码和快速查看状态均可通过地址恢复">
      <div className="pxv2-filter-bar pxv21-filter-grid">
        <FilterSelect label="企业" name="company" value={company} options={companyOptions} optionLabel={companyLabel} onChange={update} />
        <FilterSelect label="当前状态" name="status" value={status} options={statusOptions} onChange={update} />
        {kind === 'hazard' && <><FilterSelect label="隐患等级" name="level" value={level} options={['高', '中', '低']} onChange={update} /><FilterSelect label="是否逾期" name="overdue" value={overdue} options={['是', '否']} onChange={update} /></>}
        {kind === 'inspection' && <FilterSelect label="是否发现问题" name="result" value={result} options={['正常', '存在异常', '漏检']} onChange={update} />}
        {(kind === 'permit' || kind === 'training') && <FilterSelect label={kind === 'permit' ? '作业类型' : '培训主题'} name="type" value={type} options={typeOptions} onChange={update} />}
        <FilterInput label={kind === 'hazard' ? '编号 / 关键词 / 人员' : '编号 / 企业 / 执行人'} name="q" value={q || person} placeholder="输入关键词" onChange={update} />
        <FilterInput label="开始日期" name="from" value={from} placeholder="开始日期" type="date" onChange={update} />
        <FilterInput label="结束日期" name="to" value={to} placeholder="结束日期" type="date" onChange={update} />
        <button className="pxv2-secondary-button" type="button" onClick={reset}><RotateCcw size={16} />重置</button>
      </div>
    </Panel>
    <Panel title={`${title}清单`} note="快速查看打开宽抽屉，完整详情进入独立页面">
      {kind === 'hazard' && <DataTable headers={['记录编号', '企业', '隐患描述', '等级', '上报人', '上报时间', '责任人', '整改期限', '当前状态', '闭环时间', '操作']} minWidth={1480}>{!paged.length ? <EmptyRow columns={11} /> : (paged as HazardRecord[]).map(item => <tr key={item.id}><td>{item.id}</td><td>{companyLabel(item.company_id)}</td><td><span className="pxv21-ellipsis" title={item.description}>{item.title}</span></td><td><StatusPill value={`${item.level}风险`} /></td><td>{item.reporter || '未提供'}</td><td>{item.reported_at}</td><td>{item.responsible_person}</td><td>{item.deadline}</td><td><StatusPill value={item.status} /></td><td>{item.closed_at || '未闭环'}</td><td><div className="pxv21-row-actions"><Link to={previewHref(item.id)} state={{ drawer: true }}>快速查看</Link><Link to={`${businessBasePath(kind)}/${item.id}?from=${encodeURIComponent(location.pathname + location.search)}`}>完整详情</Link></div></td></tr>)}</DataTable>}
      {kind === 'inspection' && <DataTable headers={['记录编号', '企业', '巡检点位', '巡检人', '巡检时间', '检查项', '异常项', '结果', '关联隐患', '操作']} minWidth={1260}>{!paged.length ? <EmptyRow columns={10} /> : (paged as PatrolRecord[]).map(item => <tr key={item.id}><td>{item.id}</td><td>{companyLabel(item.company_id)}</td><td>{item.checkpoint}</td><td>{item.inspector}</td><td>{item.checked_at}</td><td>{item.item_count ?? '未提供'}</td><td>{item.abnormal_count ?? '未提供'}</td><td><StatusPill value={item.status} /></td><td>{item.linked_hazard_id ? <Link className="pxv2-table-link" to={`/gov/pingxiang/hazards/${item.linked_hazard_id}`}>{item.linked_hazard_id}</Link> : '无'}</td><td><div className="pxv21-row-actions"><Link to={previewHref(item.id)} state={{ drawer: true }}>快速查看</Link><Link to={`${businessBasePath(kind)}/${item.id}?from=${encodeURIComponent(location.pathname + location.search)}`}>完整详情</Link></div></td></tr>)}</DataTable>}
      {kind === 'permit' && <DataTable headers={['票号', '企业', '作业类型', '申请人', '作业地点', '计划时间', '审批状态', '监护人', '完工状态', '操作']} minWidth={1320}>{!paged.length ? <EmptyRow columns={10} /> : (paged as WorkPermitRecord[]).map(item => <tr key={item.id}><td>{item.id}</td><td>{companyLabel(item.company_id)}</td><td>{item.permit_type}</td><td>{item.applicant}</td><td>{item.location}</td><td>{item.planned_start}<br />{item.planned_end}</td><td><StatusPill value={item.status} /></td><td>{item.guardian || '未提供'}</td><td>{item.completed_at ? '已完工' : '未完工'}</td><td><div className="pxv21-row-actions"><Link to={previewHref(item.id)} state={{ drawer: true }}>快速查看</Link><Link to={`${businessBasePath(kind)}/${item.id}?from=${encodeURIComponent(location.pathname + location.search)}`}>完整详情</Link></div></td></tr>)}</DataTable>}
      {kind === 'training' && <DataTable headers={['培训编号', '企业', '主题', '方式', '开始时间', '参与人数', '完成人数', '考试人数', '合格人数', '状态', '操作']} minWidth={1380}>{!paged.length ? <EmptyRow columns={11} /> : (paged as TrainingRecord[]).map(item => { const participants = item.participants || []; const completed = participants.filter(personItem => personItem.completed); const examined = participants.filter(personItem => personItem.score !== null); return <tr key={item.id}><td>{item.id}</td><td>{companyLabel(item.company_id)}</td><td>{item.title || item.course_name}</td><td>{item.method || '未提供'}</td><td>{item.started_at || '未提供'}</td><td>{participants.length}</td><td>{completed.length}</td><td>{examined.length}</td><td>{examined.filter(personItem => personItem.passed).length}</td><td><StatusPill value={item.status} /></td><td><div className="pxv21-row-actions"><Link to={previewHref(item.id)} state={{ drawer: true }}>快速查看</Link><Link to={`${businessBasePath(kind)}/${item.id}?from=${encodeURIComponent(location.pathname + location.search)}`}>完整详情</Link></div></td></tr> })}</DataTable>}
      {!paged.length && <div className="pxv21-empty-action"><button type="button" onClick={reset}>清除筛选</button></div>}
      <Pager page={currentPage} totalPages={totalPages} total={rows.length} pageSize={pageSize} onPage={next => update('page', next, false)} />
    </Panel>
    {previewRecord && <BusinessRecordDrawer state={state} kind={kind} record={previewRecord} fromHref={`${location.pathname}${location.search}`} />}
  </div>
}

export const HazardsPageV2 = ({ state }: { state: PingxiangDataState }) => <BusinessListPage state={state} kind="hazard" />
export const PatrolsPageV2 = ({ state }: { state: PingxiangDataState }) => <BusinessListPage state={state} kind="inspection" />
export const WorkPermitsPageV2 = ({ state }: { state: PingxiangDataState }) => <BusinessListPage state={state} kind="permit" />
export const TrainingPageV2 = ({ state }: { state: PingxiangDataState }) => <BusinessListPage state={state} kind="training" />

const reports = [
  { id: 'monthly', name: '月度运行报告', period: '2026年7月', note: '聚焦当月四项功能运行情况' },
  { id: '30-day', name: '30日阶段报告', period: '近30日', note: '呈现企业活跃度与重点跟进事项' },
  { id: '90-day', name: '90日阶段报告', period: '近90日', note: '呈现项目阶段趋势与企业分布' },
  { id: 'demo', name: '项目演示报告', period: '演示周期', note: '用于功能展示与汇报演示' },
]

const reportHtml = (state: PingxiangDataState, reportName: string) => {
  const openHazards = state.data.hazardRecords.filter(item => !isClosedHazard(item.status)).length
  const abnormalPatrols = state.data.patrolRecords.filter(item => isAbnormalPatrol(item.status)).length
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${reportName}</title><style>body{font-family:"Microsoft YaHei",sans-serif;color:#10233f;margin:0;background:#f4f7fb}.page{width:900px;margin:40px auto;background:#fff;padding:56px;box-shadow:0 10px 40px #cbd6e5}.watermark{position:fixed;inset:40% 0;text-align:center;font-size:56px;color:rgba(30,112,225,.08);transform:rotate(-18deg)}h1{font-size:36px;color:#075ecb}h2{margin-top:34px;border-bottom:2px solid #e3ebf6;padding-bottom:10px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.metric{padding:18px;background:#f1f6fd;border-radius:12px}.metric b{display:block;font-size:28px;color:#126de2}table{width:100%;border-collapse:collapse}th,td{padding:11px;border-bottom:1px solid #dce5f1;text-align:left}.note{margin-top:32px;padding:16px;background:#fff6df;color:#765000}@media print{body{background:#fff}.page{box-shadow:none;margin:0;width:auto}.watermark{display:block}}</style></head><body><div class="watermark">演示数据，仅用于功能展示</div><main class="page"><small>平乡县企业现场安全管理运行平台</small><h1>${reportName}</h1><p>报告周期：2026年7月 · 生成时间：2026-07-22</p><h2>总体指标</h2><div class="metrics"><div class="metric">试点企业<b>${state.companies.length}家</b></div><div class="metric">隐患记录<b>${state.data.hazardRecords.length}条</b></div><div class="metric">巡检记录<b>${state.data.patrolRecords.length}条</b></div><div class="metric">培训参与<b>${trainingParticipantCount(state.data)}人次</b></div></div><h2>四项业务统计</h2><table><tr><th>业务</th><th>记录总数</th><th>重点结果</th></tr><tr><td>隐患整改</td><td>${state.data.hazardRecords.length}</td><td>未闭环 ${openHazards} 条</td></tr><tr><td>巡检点检</td><td>${state.data.patrolRecords.length}</td><td>问题记录 ${abnormalPatrols} 条</td></tr><tr><td>作业票</td><td>${state.data.workPermitRecords.length}</td><td>已完成 ${state.data.workPermitRecords.filter(item => item.status === '已完成').length} 张</td></tr><tr><td>培训考试</td><td>${state.data.trainingRecords.length}</td><td>参与 ${trainingParticipantCount(state.data)} 人次</td></tr></table><h2>数据口径</h2><p>本报告与平台首页、清单和详情使用同一套演示数据模型。所有数据仅用于功能与业务流程展示，不作为执法认定依据。</p><div class="note">演示数据，仅用于功能展示</div></main></body></html>`
}

export function ReportsPageV2({ state }: { state: PingxiangDataState }) {
  return <div className="pxv2-page-stack"><PageTitle eyebrow="项目运行成果输出" title="阶段报告" description="预览项目阶段结论，并下载可阅读的演示报告文件。" /><SummaryMetrics metrics={[
    { label: '试点企业', value: state.companies.length, unit: '家', note: '纳入报告范围', icon: Building2, tone: 'blue' },
    { label: '隐患记录', value: state.data.hazardRecords.length, unit: '条', note: '统一数据模型', icon: AlertTriangle, tone: 'orange' },
    { label: '巡检记录', value: state.data.patrolRecords.length, unit: '条', note: '统一数据模型', icon: SearchCheck, tone: 'green' },
    { label: '培训参与', value: trainingParticipantCount(state.data), unit: '人次', note: '按人员明细统计', icon: UsersRound, tone: 'violet' },
  ]} /><Panel title="可用报告" note="报告数字与同周期首页和清单保持一致"><div className="pxv21-report-list">{reports.map(report => <article key={report.id}><span><FileBarChart /></span><div><strong>{report.name}</strong><p>{report.period} · {report.note}</p></div><Link to={`/gov/pingxiang/reports/${report.id}`}>查看完整报告</Link></article>)}</div></Panel></div>
}

export function ReportPreviewPageV2({ state, reportId }: { state: PingxiangDataState; reportId: string }) {
  const report = reports.find(item => item.id === reportId) || reports[0]
  const openHazards = state.data.hazardRecords.filter(item => !isClosedHazard(item.status)).length
  const activeCompanies = state.companies.filter(item => item.runningStatus === '近期有有效记录').length
  const download = () => {
    const blob = new Blob([reportHtml(state, report.name)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `平乡县-${report.name}-演示版.html`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const statusSeries: VisualChartSeries[] = [{ label: '企业数', color: '#1677ff', values: [activeCompanies, state.companies.length - activeCompanies] }]
  return <div className="pxv2-page-stack pxv21-report-preview"><div className="pxv21-report-cover"><span>演示数据，仅用于功能展示</span><Landmark size={48} /><p>平乡县企业现场安全管理运行平台</p><h1>{report.name}</h1><strong>{report.period}</strong><div><Link to="/gov/pingxiang/reports">返回报告清单</Link><button type="button" onClick={download}><Download size={17} />下载演示报告</button></div></div><Panel title="总体指标"><div className="pxv21-report-metrics"><span>试点企业<strong>{state.companies.length}家</strong></span><span>有效运行企业<strong>{activeCompanies}家</strong></span><span>隐患记录<strong>{state.data.hazardRecords.length}条</strong></span><span>未闭环隐患<strong>{openHazards}条</strong></span><span>巡检记录<strong>{state.data.patrolRecords.length}条</strong></span><span>培训参与<strong>{trainingParticipantCount(state.data)}人次</strong></span></div></Panel><section className="pxv21-report-columns"><Panel title="企业运行分布"><LineChartSvg labels={['有效运行', '需关注']} series={statusSeries} maxValue={Math.max(1, state.companies.length)} /></Panel><Panel title="四项业务统计"><div className="pxv21-report-business"><span>隐患整改<b>{state.data.hazardRecords.length}</b></span><span>巡检点检<b>{state.data.patrolRecords.length}</b></span><span>作业票<b>{state.data.workPermitRecords.length}</b></span><span>培训活动<b>{state.data.trainingRecords.length}</b></span></div></Panel></section><Panel title="重点企业清单"><DataTable headers={['企业名称', '运行状态', '未闭环隐患', '问题巡检', '最近有效记录']} minWidth={900}>{state.companies.filter(item => item.openHazards || item.abnormalPatrols || item.runningStatus !== '近期有有效记录').slice(0, 10).map(item => <tr key={item.company.company_id}><td>{item.company.company_name}</td><td><StatusPill value={item.runningStatus} /></td><td>{item.openHazards}</td><td>{item.abnormalPatrols}</td><td>{item.latestUpdate}</td></tr>)}</DataTable></Panel><Panel title="数据口径说明"><ScopeNote>报告、首页、列表与详情使用同一套前端演示数据模型；演示数据仅用于功能展示，不作为执法认定依据。</ScopeNote></Panel></div>
}

export function ProjectAboutPageV2() {
  return <div className="pxv2-page-stack"><PageTitle eyebrow="试点项目说明" title="项目介绍" description="平乡县企业现场安全管理四项闭环数字化试点项目。" /><section className="pxv2-about-grid"><Panel title="项目背景"><p className="pxv2-prose">围绕企业隐患整改、巡检点检、作业票和培训考试四项现场安全管理动作，形成可归集、可追溯、可复盘的县域试点运行视图。</p></Panel><Panel title="政府端定位"><p className="pxv2-prose">平台为政府端只读运行视图，用于了解试点项目运行情况，不替代企业安全管理，也不作为执法认定依据。</p></Panel><Panel title="演示环境"><p className="pxv2-prose">当前仅使用内部演示数据，所有页面固定显示“演示环境”，不包含正式账号、数据库、人工智能或政府接口能力。</p></Panel></section><Panel title="四项功能与数据流向"><div className="pxv21-project-flow"><Link to="/gov/pingxiang/hazards"><AlertTriangle />隐患整改</Link><Link to="/gov/pingxiang/inspections"><SearchCheck />巡检点检</Link><Link to="/gov/pingxiang/work-permits"><TicketCheck />作业票管理</Link><Link to="/gov/pingxiang/trainings"><GraduationCap />培训考试</Link><span>企业端形成记录</span><span>项目归集形成运行视图</span><span>政府端只读查看与追溯</span></div></Panel><Panel title="快捷入口"><div className="pxv21-action-grid"><Link to="/gov/pingxiang"><Landmark />返回运行总览</Link><Link to="/gov/pingxiang/companies"><Building2 />查看企业清单</Link><Link to="/gov/pingxiang/reports"><FileText />查看阶段报告</Link></div></Panel></div>
}
