import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  RotateCcw,
  Search,
  ShieldCheck,
  TicketCheck,
} from 'lucide-react'
import { BackLink, DataNotice, DataTable, EmptyState, MetricCard, PageHeader, Panel, StatusTag } from './components'
import type { DashboardViewData } from './dashboardAdapter'
import type { CompanyRuntime } from './usePingxiangDashboardData'

type PageProps = {
  data: DashboardViewData
  overview: DashboardViewData['overview']
  companies: CompanyRuntime[]
  isRealView: boolean
}

type RecordType = '隐患' | '巡检' | '作业票' | '培训'
type DetailTab = 'hazards' | 'patrols' | 'permits' | 'trainings'

type RuntimeRecord = {
  id: string
  type: RecordType
  companyId: string
  summary: string
  status: string
  time: string
}

type CompanyFilters = {
  keyword: string
  industry: string
  enabled: string
  status: string
  updateRange: string
}

const defaultFilters: CompanyFilters = {
  keyword: '',
  industry: 'all',
  enabled: 'all',
  status: 'all',
  updateRange: 'all',
}

const companyName = (companies: CompanyRuntime[], companyId: string) => (
  companies.find(item => item.company.company_id === companyId)?.company.company_name || '未识别企业'
)

const latest = (values: string[]) => values.filter(value => value && value !== '暂无更新').sort().at(-1) || '暂无有效数据'

const parseRecordTime = (value: string) => {
  if (!value || value === '暂无更新') return 0
  const timestamp = Date.parse(value.replace(' ', 'T'))
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const isRecent = (value: string) => {
  const timestamp = parseRecordTime(value)
  return timestamp > 0 && Date.now() - timestamp <= 30 * 24 * 60 * 60 * 1000
}

const formatMonth = (value: string) => value.slice(0, 7)

const formatTrendBucket = (value: string, weekly: boolean) => {
  const month = formatMonth(value)
  if (month.length !== 7) return ''
  if (!weekly) return month
  const day = Number(value.slice(8, 10))
  return day > 0 ? `${month.slice(5)}月第${Math.ceil(day / 7)}周` : month
}

const buildRuntimeRecords = (data: DashboardViewData): RuntimeRecord[] => [
  ...data.hazardRecords.map(item => ({ id: item.id, type: '隐患' as const, companyId: item.company_id, summary: item.title, status: item.status, time: item.reported_at })),
  ...data.patrolRecords.map(item => ({ id: item.id, type: '巡检' as const, companyId: item.company_id, summary: item.checkpoint || item.route_name, status: item.status, time: item.checked_at })),
  ...data.workPermitRecords.map(item => ({ id: item.id, type: '作业票' as const, companyId: item.company_id, summary: item.permit_type, status: item.status, time: item.submitted_at })),
  ...data.trainingRecords.map(item => ({ id: item.id, type: '培训' as const, companyId: item.company_id, summary: item.course_name, status: item.status, time: item.completed_at })),
].sort((a, b) => parseRecordTime(b.time) - parseRecordTime(a.time))

const recordTypePath: Record<RecordType, string> = {
  隐患: '/gov/pingxiang/hazards',
  巡检: '/gov/pingxiang/patrols',
  作业票: '/gov/pingxiang/work-permits',
  培训: '/gov/pingxiang/training',
}

export const OverviewPage = ({ data, overview, companies, isRealView }: PageProps) => {
  const [showAllRecords, setShowAllRecords] = useState(false)
  const allRecords = useMemo(() => buildRuntimeRecords(data), [data])
  const recentRecords = allRecords.slice(0, showAllRecords ? 10 : 6)
  const openedCompanies = companies.filter(item => item.company.enabled).length
  const activeCompanies = companies.filter(item => item.runningStatus === '近期有有效记录').length
  const quietCompanies = companies
    .filter(item => item.runningStatus !== '近期有有效记录')
    .sort((a, b) => parseRecordTime(a.latestUpdate) - parseRecordTime(b.latestUpdate))
    .slice(0, 5)
  const trend = useMemo(() => {
    const months = Array.from(new Set(allRecords.map(item => formatMonth(item.time)).filter(month => month.length === 7))).sort()
    const weekly = months.length <= 1
    const periods = Array.from(new Set(allRecords.map(item => formatTrendBucket(item.time, weekly)).filter(Boolean))).sort().slice(-6)
    return periods.map(period => ({
      period,
      隐患: allRecords.filter(item => item.type === '隐患' && formatTrendBucket(item.time, weekly) === period).length,
      巡检: allRecords.filter(item => item.type === '巡检' && formatTrendBucket(item.time, weekly) === period).length,
      作业票: allRecords.filter(item => item.type === '作业票' && formatTrendBucket(item.time, weekly) === period).length,
      培训: allRecords.filter(item => item.type === '培训' && formatTrendBucket(item.time, weekly) === period).length,
    }))
  }, [allRecords])
  const trendMax = Math.max(1, ...trend.flatMap(item => [item.隐患, item.巡检, item.作业票, item.培训]))
  const statusCounts = [
    { label: '近期有有效记录', value: companies.filter(item => item.runningStatus === '近期有有效记录').length, tone: 'blue' },
    { label: '近期记录较少', value: companies.filter(item => item.runningStatus === '近期记录较少').length, tone: 'amber' },
    { label: '尚未形成有效记录', value: companies.filter(item => item.runningStatus === '尚未形成有效记录').length, tone: 'slate' },
  ]

  return (
    <div className="pxgov-page-stack pxgov-overview-page">
      <PageHeader
        eyebrow="试点运行情况"
        title="运行总览"
        description="集中展示首批试点企业开通、使用及四项闭环数据情况。数据以企业实际使用及成功归集的记录为准。"
        action={<span className="pxgov-update-chip"><CalendarClock size={17} />最近有效数据时间：{latest(companies.map(item => item.latestUpdate))}</span>}
      />
      <DataNotice demo={!isRealView} />

      <section className="pxgov-metric-grid pxgov-overview-metrics">
        <MetricCard label="试点企业数" value={companies.length} unit="家" note="当前纳入试点范围" icon={Building2} />
        <MetricCard label="已开通企业数" value={openedCompanies} unit="家" note="已完成平台开通" icon={CheckCircle2} tone="green" />
        <MetricCard label="近期有有效记录企业" value={activeCompanies} unit="家" note="近30日内产生有效记录" icon={Activity} />
        <MetricCard label="隐患记录数" value={overview.hazardTotal} unit="条" note={`待整改 ${overview.pendingHazards} 条`} icon={ShieldCheck} tone={overview.pendingHazards > 0 ? 'amber' : 'green'} />
        <MetricCard label="巡检记录数" value={overview.patrolTotal} unit="条" note={`发现问题 ${overview.patrolAbnormal} 条`} icon={ClipboardCheck} />
        <MetricCard label="作业票及培训记录" value={overview.permitTotal + overview.trainingPeople} unit="条" note={`作业票 ${overview.permitTotal} · 培训 ${overview.trainingPeople}`} icon={FileText} />
      </section>

      <section className="pxgov-overview-grid">
        <Panel title="四项功能记录趋势" subtitle="按月汇总已成功归集的有效记录">
          {trend.length === 0 ? (
            <EmptyState title="当前尚未形成趋势数据" description="企业完成开通并实际使用后将逐步更新。" />
          ) : (
            <div className="pxgov-trend-chart">
              <div className="pxgov-chart-legend">
                {(['隐患', '巡检', '作业票', '培训'] as RecordType[]).map(type => <span key={type} className={`type-${type}`}>{type}</span>)}
              </div>
              <div className="pxgov-grouped-chart">
                <div className="pxgov-chart-grid" aria-hidden="true"><span /><span /><span /><span /></div>
                <div className="pxgov-chart-columns">
                  {trend.map(item => (
                    <div className="pxgov-chart-group" key={item.period}>
                      <div className="pxgov-chart-bars">
                        {(['隐患', '巡检', '作业票', '培训'] as RecordType[]).map(type => (
                          <span key={type} className={`type-${type}`} style={{ height: `${Math.max(4, (item[type] / trendMax) * 100)}%` }} title={`${type} ${item[type]} 条`}>
                            <i>{item[type]}</i>
                          </span>
                        ))}
                      </div>
                      <strong>{item.period}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="企业运行状态分布" subtitle="仅反映近期数据记录情况，不作风险认定">
          <div className="pxgov-status-distribution">
            {statusCounts.map(item => (
              <div key={item.label}>
                <span className={`pxgov-distribution-dot ${item.tone}`} />
                <strong>{item.label}</strong>
                <div><span style={{ width: `${companies.length ? (item.value / companies.length) * 100 : 0}%` }} /></div>
                <b>{item.value}家</b>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="pxgov-overview-grid pxgov-overview-grid-secondary">
        <Panel className="pxgov-attention-panel" title="近期记录较少的企业" subtitle="用于了解试点运行节奏，不代表企业安全管理结论" action={<Link className="pxgov-text-link" to="/gov/pingxiang/companies">查看企业清单</Link>}>
          {quietCompanies.length === 0 ? (
            <EmptyState title="当前暂无近期记录较少的企业" description="试点企业近期均产生了有效记录。" />
          ) : (
            <div className="pxgov-company-attention-list">
              {quietCompanies.map(item => (
                <Link key={item.company.company_id} to={`/gov/pingxiang/company/${item.company.company_id}`}>
                  <span><strong>{item.company.company_name}</strong><small>最近有效数据：{item.latestUpdate}</small></span>
                  <StatusTag value={item.runningStatus} />
                  <em>查看详情</em>
                </Link>
              ))}
            </div>
          )}
          <div className="pxgov-boundary-note">本提示仅用于了解试点运行情况，不作为企业是否履行安全生产责任的认定依据。</div>
        </Panel>

        <Panel
          className="pxgov-recent-panel"
          title="最近运行记录"
          subtitle={`默认显示最近6条记录${allRecords.length > 6 ? `，共归集 ${allRecords.length} 条` : ''}`}
          action={allRecords.length > 6 ? <button className="pxgov-text-button" type="button" onClick={() => setShowAllRecords(value => !value)}>{showAllRecords ? '收起' : '查看全部'}</button> : undefined}
        >
          {recentRecords.length === 0 ? (
            <EmptyState title="当前尚未归集有效数据" description="企业完成开通并实际使用后将逐步更新。" />
          ) : (
            <div className="pxgov-runtime-list">
              {recentRecords.map(record => (
                <Link key={`${record.type}-${record.id}`} to={recordTypePath[record.type]}>
                  <span className={`pxgov-record-type type-${record.type}`}>{record.type}</span>
                  <span className="pxgov-runtime-copy"><strong>{record.summary}</strong><small>{companyName(companies, record.companyId)}</small></span>
                  <StatusTag value={record.status} />
                  <time>{record.time || '暂无时间'}</time>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  )
}

export const CompaniesPage = ({ companies, isRealView }: PageProps) => {
  const [draft, setDraft] = useState<CompanyFilters>(defaultFilters)
  const [filters, setFilters] = useState<CompanyFilters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const industries = Array.from(new Set(companies.map(item => item.company.industry).filter(Boolean))).sort()
  const filteredCompanies = useMemo(() => companies.filter(item => {
    const keywordMatches = !filters.keyword || item.company.company_name.toLowerCase().includes(filters.keyword.trim().toLowerCase())
    const industryMatches = filters.industry === 'all' || item.company.industry === filters.industry
    const enabledMatches = filters.enabled === 'all' || (filters.enabled === 'enabled' ? item.company.enabled : !item.company.enabled)
    const statusMatches = filters.status === 'all' || item.runningStatus === filters.status
    const updateMatches = filters.updateRange === 'all'
      || (filters.updateRange === 'recent' && isRecent(item.latestUpdate))
      || (filters.updateRange === 'older' && parseRecordTime(item.latestUpdate) > 0 && !isRecent(item.latestUpdate))
      || (filters.updateRange === 'none' && parseRecordTime(item.latestUpdate) === 0)
    return keywordMatches && industryMatches && enabledMatches && statusMatches && updateMatches
  }), [companies, filters])
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedCompanies = filteredCompanies.slice((safePage - 1) * pageSize, safePage * pageSize)

  const applyFilters = () => {
    setFilters(draft)
    setPage(1)
  }

  const resetFilters = () => {
    setDraft(defaultFilters)
    setFilters(defaultFilters)
    setPage(1)
  }

  return (
    <div className="pxgov-page-stack">
      <PageHeader
        eyebrow="试点企业档案"
        title="企业清单"
        description="查看试点企业开通情况、最近有效数据时间和四项功能记录概况。"
        action={<span className="pxgov-count-chip">共 {filteredCompanies.length} 家企业</span>}
      />
      <DataNotice demo={!isRealView} compact />

      <Panel title="查询条件" subtitle="可按企业基础信息和近期运行状态筛选">
        <div className="pxgov-filter-grid">
          <label className="pxgov-filter-field pxgov-filter-keyword">
            <span>企业名称</span>
            <div><Search size={17} /><input value={draft.keyword} onChange={event => setDraft(value => ({ ...value, keyword: event.target.value }))} placeholder="请输入企业名称" /></div>
          </label>
          <label className="pxgov-filter-field"><span>所属行业</span><select value={draft.industry} onChange={event => setDraft(value => ({ ...value, industry: event.target.value }))}><option value="all">全部行业</option>{industries.map(industry => <option key={industry} value={industry}>{industry}</option>)}</select></label>
          <label className="pxgov-filter-field"><span>开通状态</span><select value={draft.enabled} onChange={event => setDraft(value => ({ ...value, enabled: event.target.value }))}><option value="all">全部状态</option><option value="enabled">已开通</option><option value="disabled">未开通</option></select></label>
          <label className="pxgov-filter-field"><span>运行状态</span><select value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))}><option value="all">全部状态</option><option value="近期有有效记录">近期有有效记录</option><option value="近期记录较少">近期记录较少</option><option value="尚未形成有效记录">尚未形成有效记录</option></select></label>
          <label className="pxgov-filter-field"><span>最近更新时间</span><select value={draft.updateRange} onChange={event => setDraft(value => ({ ...value, updateRange: event.target.value }))}><option value="all">全部时间</option><option value="recent">近30日</option><option value="older">30日以前</option><option value="none">暂无有效数据</option></select></label>
          <div className="pxgov-filter-actions">
            <button className="pxgov-primary-button" type="button" onClick={applyFilters}><Search size={17} />查询</button>
            <button className="pxgov-secondary-button" type="button" onClick={resetFilters}><RotateCcw size={17} />重置</button>
          </div>
        </div>
      </Panel>

      <Panel title="企业运行清单" subtitle="点击企业名称或查看详情进入企业只读运行档案">
        {pagedCompanies.length === 0 ? (
          <EmptyState title="未找到符合条件的企业" description="请调整查询条件后重新查询。" action={<button className="pxgov-secondary-button" type="button" onClick={resetFilters}>重置查询条件</button>} />
        ) : (
          <CompanyTable companies={pagedCompanies} />
        )}
        <div className="pxgov-pagination">
          <span>共 {filteredCompanies.length} 条，第 {safePage}/{totalPages} 页</span>
          <div>
            <label>每页 <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={10}>10条</option><option value={20}>20条</option><option value={50}>50条</option></select></label>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>上一页</button>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>下一页</button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

export const CompanyDetailPage = ({ companyId, companies, isRealView }: PageProps & { companyId: string }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('hazards')
  const item = companies.find(row => row.company.company_id === companyId)

  if (!item) {
    return (
      <div className="pxgov-page-stack">
        <PageHeader title="企业详情" description="未找到对应的企业运行档案。" action={<BackLink to="/gov/pingxiang/companies" label="返回企业清单" />} />
        <EmptyState title="未找到企业" description="请返回企业清单重新选择。" />
      </div>
    )
  }

  const tabs: Array<{ key: DetailTab; label: string; count: number }> = [
    { key: 'hazards', label: '隐患记录', count: item.hazards.length },
    { key: 'patrols', label: '巡检记录', count: item.patrols.length },
    { key: 'permits', label: '作业票记录', count: item.permits.length },
    { key: 'trainings', label: '培训考试', count: item.trainings.length },
  ]

  const renderTab = (): ReactNode => {
    if (activeTab === 'hazards') {
      return item.hazards.length === 0 ? <EmptyState title="暂无隐患记录" description="企业实际使用后将逐步归集。" /> : (
        <DataTable columns={['隐患事项', '当前状态', '上报时间', '整改期限']}>
          {item.hazards.slice(0, 8).map(row => <tr key={row.id}><td>{row.title}</td><td><StatusTag value={row.status} /></td><td>{row.reported_at || '暂无记录'}</td><td>{row.deadline || '暂无记录'}</td></tr>)}
        </DataTable>
      )
    }
    if (activeTab === 'patrols') {
      return item.patrols.length === 0 ? <EmptyState title="暂无巡检记录" description="企业实际使用后将逐步归集。" /> : (
        <DataTable columns={['点位或设备', '巡检结果', '提交人员', '提交时间']}>
          {item.patrols.slice(0, 8).map(row => <tr key={row.id}><td>{row.checkpoint || row.route_name}</td><td><StatusTag value={row.status} /></td><td>{row.inspector || '暂无记录'}</td><td>{row.checked_at || '暂无记录'}</td></tr>)}
        </DataTable>
      )
    }
    if (activeTab === 'permits') {
      return item.permits.length === 0 ? <EmptyState title="暂无作业票记录" description="企业实际使用后将逐步归集。" /> : (
        <DataTable columns={['作业类型', '作业地点', '当前状态', '提交时间']}>
          {item.permits.slice(0, 8).map(row => <tr key={row.id}><td>{row.permit_type}</td><td>{row.location || '暂无记录'}</td><td><StatusTag value={row.status} /></td><td>{row.submitted_at || '暂无记录'}</td></tr>)}
        </DataTable>
      )
    }
    return item.trainings.length === 0 ? <EmptyState title="暂无培训考试记录" description="企业实际使用后将逐步归集。" /> : (
      <DataTable columns={['培训主题', '参与人员', '完成状态', '完成时间']}>
        {item.trainings.slice(0, 8).map(row => <tr key={row.id}><td>{row.course_name}</td><td>{row.person_name || '暂无记录'}</td><td><StatusTag value={row.status} /></td><td>{row.completed_at || '暂无记录'}</td></tr>)}
      </DataTable>
    )
  }

  return (
    <div className="pxgov-page-stack">
      <PageHeader
        eyebrow="企业运行档案"
        title={item.company.company_name}
        description="查看企业基础信息、四项功能运行概况和最近归集记录。"
        action={<BackLink to="/gov/pingxiang/companies" label="返回企业清单" />}
      />
      <DataNotice demo={!isRealView} compact />

      <section className="pxgov-company-profile">
        <div className="pxgov-company-profile-main">
          <span className="pxgov-company-avatar"><Building2 size={28} /></span>
          <div><strong>{item.company.company_name}</strong><span>{item.company.industry || '暂无行业信息'} · 平乡县试点企业</span></div>
        </div>
        <div className="pxgov-company-profile-status"><span>运行状态</span><StatusTag value={item.runningStatus} /></div>
        <div className="pxgov-company-profile-status"><span>开通状态</span><StatusTag value={item.company.enabled ? '已开通' : '未开通'} /></div>
        <div className="pxgov-company-profile-status"><span>最近有效数据时间</span><strong>{item.latestUpdate}</strong></div>
      </section>

      <Panel title="企业基础信息" subtitle="联系人和完整电话根据权限控制，不在政府端默认展示">
        <div className="pxgov-info-grid">
          <InfoItem label="所属行业" value={item.company.industry || '暂无行业信息'} />
          <InfoItem label="企业地址" value={item.company.address || '暂无地址信息'} />
          <InfoItem label="开通时间" value="暂未归集" />
          <InfoItem label="系统管理员" value="由企业端自行维护" />
          <InfoItem label="数据来源方式" value={isRealView ? '企业端实际记录归集' : '演示环境数据'} />
          <InfoItem label="最近数据更新时间" value={item.latestUpdate} />
        </div>
      </Panel>

      <section className="pxgov-function-summary-grid">
        <FunctionSummary icon={<ShieldCheck size={21} />} title="隐患整改" href="/gov/pingxiang/hazards" items={[['隐患记录', item.hazards.length], ['整改中', item.openHazards], ['已复查/销号', item.closedHazards]]} />
        <FunctionSummary icon={<ClipboardCheck size={21} />} title="巡检点检" href="/gov/pingxiang/patrols" items={[['巡检记录', item.patrols.length], ['记录正常', Math.max(0, item.patrols.length - item.abnormalPatrols)], ['发现问题', item.abnormalPatrols]]} />
        <FunctionSummary icon={<TicketCheck size={21} />} title="作业票" href="/gov/pingxiang/work-permits" items={[['记录总数', item.permits.length], ['进行中', item.permits.filter(row => row.status.includes('审批')).length], ['已完成', item.permits.filter(row => row.status.includes('完成') || row.status.includes('通过')).length]]} />
        <FunctionSummary icon={<GraduationCap size={21} />} title="培训考试" href="/gov/pingxiang/training" items={[['记录总数', item.trainings.length], ['已完成', item.trainings.filter(row => row.status.includes('完成')).length], ['考试合格', item.trainings.filter(row => row.exam_result.includes('合格')).length]]} />
      </section>

      <Panel title="最近运行记录" subtitle="政府端只读展示，不提供审批、整改、修改或删除操作">
        <div className="pxgov-detail-tabs" role="tablist" aria-label="企业最近记录分类">
          {tabs.map(tab => <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>{tab.label}<span>{tab.count}</span></button>)}
        </div>
        <div className="pxgov-tab-content">{renderTab()}</div>
      </Panel>

      <div className="pxgov-boundary-note pxgov-detail-boundary">本页面数据来源于企业端实际使用记录及项目归集数据，仅用于试点运行情况展示，不替代企业内部安全管理，也不作为监管执法认定依据。</div>
    </div>
  )
}

const CompanyTable = ({ companies }: { companies: CompanyRuntime[] }) => (
  <div className="pxgov-company-table">
    <DataTable columns={['企业名称', '所属行业', '开通状态', '最近有效数据时间', '隐患记录', '巡检记录', '作业票记录', '培训记录', '运行状态', '操作']}>
      {companies.map(item => (
        <tr key={item.company.company_id}>
          <td className="pxgov-company-name-cell"><Link title={item.company.company_name} to={`/gov/pingxiang/company/${item.company.company_id}`}>{item.company.company_name}</Link></td>
          <td>{item.company.industry || '暂无行业信息'}</td>
          <td><StatusTag value={item.company.enabled ? '已开通' : '未开通'} /></td>
          <td>{item.latestUpdate}</td>
          <td>{item.hazards.length}</td>
          <td>{item.patrols.length}</td>
          <td>{item.permits.length}</td>
          <td>{item.trainings.length}</td>
          <td><StatusTag value={item.runningStatus} /></td>
          <td><Link className="pxgov-detail-btn" to={`/gov/pingxiang/company/${item.company.company_id}`}>查看详情</Link></td>
        </tr>
      ))}
    </DataTable>
  </div>
)

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="pxgov-info-item"><span>{label}</span><strong>{value || '暂无记录'}</strong></div>
)

const FunctionSummary = ({ icon, title, href, items }: { icon: ReactNode; title: string; href: string; items: Array<[string, number]> }) => (
  <Link className="pxgov-function-summary" to={href}>
    <div className="pxgov-function-summary-head"><span>{icon}</span><strong>{title}</strong><em>查看记录</em></div>
    <div>{items.map(([label, value]) => <span key={label}><b>{value}</b><small>{label}</small></span>)}</div>
  </Link>
)
