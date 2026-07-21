import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck, GraduationCap, TicketCheck } from 'lucide-react'
import { BackLink, DataTable, EmptyState, FeatureEntry, FlowSteps, MetricCard, Panel, SourceTag, StatusTag } from './components'
import type { CompanyRuntime } from './usePingxiangDashboardData'
import type { DashboardViewData } from './dashboardAdapter'

type PageProps = {
  data: DashboardViewData
  overview: DashboardViewData['overview']
  companies: CompanyRuntime[]
  isRealView: boolean
}

const companyName = (companies: CompanyRuntime[], companyId: string) =>
  companies.find(item => item.company.company_id === companyId)?.company.company_name || '未识别企业'

const latest = (values: string[]) => {
  const sorted = values.filter(Boolean).sort()
  return sorted[sorted.length - 1] || '暂无更新'
}

const EmptyRow = ({ columns, text }: { columns: number; text: string }) => (
  <tr><td className="pxgov-empty-cell" colSpan={columns}>{text}</td></tr>
)

const realEmptyText = '暂无真实记录，企业扫码填报后将自动汇总展示。'

export const OverviewPage = ({ data, overview, companies, isRealView }: PageProps) => {
  const recentHazards = data.hazardRecords.slice(0, 4)
  const recentPatrols = data.patrolRecords.slice(0, 4)
  const sourceLabel = isRealView ? '真实数据' : '演示数据'

  return (
    <div className="pxgov-page-stack">
      <section className="pxgov-portal-hero">
        <div>
          <div className="pxgov-kicker">四项闭环试点 / 风险减量服务 / 应急只读查看</div>
          <h1>平乡县企业安全管理运行平台</h1>
          <p>汇聚隐患上报、作业票管理、巡检巡查、培训考试数据，形成县域企业安全管理运行总览。</p>
        </div>
        <div className="pxgov-hero-proof">
          <strong>{overview.closureRate}%</strong>
          <span>隐患闭环率</span>
          <SourceTag real={isRealView} />
        </div>
      </section>

      <section className="pxgov-metric-grid wide">
        <MetricCard label="试点企业数" value={companies.length} note={sourceLabel} />
        <MetricCard label="隐患总数" value={overview.hazardTotal} />
        <MetricCard label="待整改隐患" value={overview.pendingHazards} />
        <MetricCard label="已闭环隐患" value={overview.fixedHazards} />
        <MetricCard label="巡检记录数" value={overview.patrolTotal} />
        <MetricCard label="作业票数量" value={overview.permitTotal} />
        <MetricCard label="培训考试数量" value={overview.trainingPeople} />
        <MetricCard label="数据更新时间" value={latest(companies.map(item => item.latestUpdate))} />
      </section>

      <section className="pxgov-feature-grid">
        <FeatureEntry to="/gov/pingxiang/hazards" title="隐患上报与整改闭环" summary="发现、上报、整改、复查、归档全过程查看" metrics={[['隐患', overview.hazardTotal], ['待整改', overview.pendingHazards], ['闭环率', `${overview.closureRate}%`]]} />
        <FeatureEntry to="/gov/pingxiang/work-permits" title="作业票管理" summary="特殊作业申请、审批留痕、归档展示" metrics={[['作业票', overview.permitTotal], ['审批中', overview.permitPending], ['已完成', overview.permitCompleted]]} />
        <FeatureEntry to="/gov/pingxiang/patrols" title="巡检巡查" summary="扫码点检、异常上报、服务检查记录" metrics={[['巡检', overview.patrolTotal], ['正常', overview.patrolNormal], ['异常', overview.patrolAbnormal]]} />
        <FeatureEntry to="/gov/pingxiang/training" title="培训考试" summary="安全培训、考试结果、人员完成情况" metrics={[['参与', overview.trainingPeople], ['完成', overview.trainingCompleted], ['合格率', `${overview.passRate}%`]]} />
      </section>

      <Panel title="企业运行清单" subtitle="点击查看详情进入企业只读运行档案">
        <CompanyTable companies={companies} isRealView={isRealView} />
      </Panel>

      <section className="pxgov-two-column">
        <Panel title="最新隐患" subtitle={isRealView && recentHazards.length === 0 ? '暂无真实隐患记录' : '企业自查自改与闭环治理动态'}>
          {recentHazards.length === 0 ? <EmptyState title="暂无真实隐患记录" /> : (
            <div className="pxgov-record-list">
              {recentHazards.map(item => <div key={item.id}><strong>{item.title}</strong><span>{companyName(companies, item.company_id)} / {item.status}</span></div>)}
            </div>
          )}
        </Panel>
        <Panel title="最新巡检" subtitle={isRealView && recentPatrols.length === 0 ? '暂无真实巡检记录' : '扫码点检与服务检查动态'}>
          {recentPatrols.length === 0 ? <EmptyState title="暂无真实巡检记录" /> : (
            <div className="pxgov-record-list">
              {recentPatrols.map(item => <div key={item.id}><strong>{item.checkpoint}</strong><span>{companyName(companies, item.company_id)} / {item.status}</span></div>)}
            </div>
          )}
        </Panel>
      </section>

      {data.warnings.length > 0 && (
        <Panel title="数据接入提示" subtitle="接口链路已预留，部分企业名称待匹配">
          <div className="pxgov-warning-note">部分企业名称待匹配，企业扫码填报后将自动汇总展示。</div>
        </Panel>
      )}
    </div>
  )
}

export const HazardsPage = ({ data, overview, companies, isRealView }: PageProps) => (
  <ModuleShell title="隐患上报与整改闭环" subtitle="展示隐患从发现、上报、整改、复查到销号的闭环过程">
    <section className="pxgov-metric-grid">
      <MetricCard label="隐患总数" value={overview.hazardTotal} />
      <MetricCard label="待整改" value={overview.pendingHazards} />
      <MetricCard label="整改中" value={data.hazardRecords.filter(item => item.status.includes('整改中')).length} />
      <MetricCard label="已闭环" value={overview.fixedHazards} />
      <MetricCard label="闭环率" value={`${overview.closureRate}%`} />
    </section>
    <Panel title="隐患闭环流程">
      <FlowSteps steps={[['发现隐患', overview.hazardTotal], ['拍照上报', overview.hazardTotal], ['管理员分派', overview.hazardTotal], ['整改上传', overview.fixedHazards], ['复查确认', overview.fixedHazards], ['销号归档', overview.fixedHazards]]} />
    </Panel>
    <Panel title="隐患记录列表" subtitle={isRealView && data.hazardRecords.length === 0 ? realEmptyText : '应急端只读查看，企业侧完成填报后自动汇总'}>
      <DataTable columns={['企业名称', '隐患标题', '状态', '提交人', '提交时间', '数据来源']} empty="暂无真实隐患记录">
        {data.hazardRecords.length === 0 ? <EmptyRow columns={6} text={isRealView ? '暂无真实隐患记录，企业扫码填报后将自动汇总展示。' : '暂无隐患记录'} /> : data.hazardRecords.map(item => (
          <tr key={item.id}><td>{companyName(companies, item.company_id)}</td><td>{item.title}</td><td><StatusTag value={item.status} /></td><td>{item.responsible_person || '-'}</td><td>{item.reported_at || '-'}</td><td><SourceTag real={isRealView} /></td></tr>
        ))}
      </DataTable>
    </Panel>
  </ModuleShell>
)

export const WorkPermitsPage = ({ data, overview, companies, isRealView }: PageProps) => (
  <ModuleShell title="作业票管理" subtitle="展示特殊作业线上申请、审批留痕和归档管理的只读记录">
    <section className="pxgov-metric-grid">
      <MetricCard label="今日作业票" value={overview.permitTotal} />
      <MetricCard label="待确认" value={overview.permitPending} />
      <MetricCard label="进行中" value={Math.max(0, overview.permitTotal - overview.permitPending - overview.permitCompleted)} />
      <MetricCard label="已归档" value={overview.permitCompleted} />
      <MetricCard label="高风险作业" value={data.workPermitRecords.filter(item => item.permit_type.includes('动火') || item.permit_type.includes('受限')).length} />
    </section>
    <Panel title="作业类型">
      <div className="pxgov-type-grid">{['动火作业', '有限空间作业', '高处作业', '临时用电作业'].map(item => <div key={item}>{item}<span>审批流程已留痕</span></div>)}</div>
    </Panel>
    <Panel title="作业票记录列表" subtitle={isRealView && data.workPermitRecords.length === 0 ? realEmptyText : '应急端只读查看，展示作业流程留痕'}>
      <DataTable columns={['企业名称', '作业类型', '作业地点', '作业时间', '当前状态', '申请人', '数据来源']}>
        {data.workPermitRecords.length === 0 ? <EmptyRow columns={7} text={isRealView ? '暂无真实作业票记录，企业扫码填报后将自动汇总展示。' : '暂无作业票记录'} /> : data.workPermitRecords.map(item => (
          <tr key={item.id}><td>{companyName(companies, item.company_id)}</td><td>{item.permit_type}</td><td>{item.location}</td><td>{item.submitted_at}</td><td><StatusTag value={item.status} /></td><td>{item.applicant}</td><td><SourceTag real={isRealView} /></td></tr>
        ))}
      </DataTable>
    </Panel>
  </ModuleShell>
)

export const PatrolsPage = ({ data, overview, companies, isRealView }: PageProps) => (
  <ModuleShell title="巡检巡查" subtitle="展示企业日常巡检、扫码点检和异常记录">
    <section className="pxgov-metric-grid">
      <MetricCard label="巡检记录数" value={overview.patrolTotal} />
      <MetricCard label="正常记录" value={overview.patrolNormal} />
      <MetricCard label="异常记录" value={overview.patrolAbnormal} />
      <MetricCard label="今日巡检" value={overview.patrolTotal} />
      <MetricCard label="最近提交时间" value={latest(data.patrolRecords.map(item => item.checked_at))} />
    </section>
    <Panel title="巡检流程">
      <FlowSteps steps={[['设置点位', '1'], ['员工扫码', '2'], ['填写结果', '3'], ['异常上报', overview.patrolAbnormal], ['数据归档', overview.patrolTotal], ['应急查看', '只读']]} />
    </Panel>
    <Panel title="巡检记录列表" subtitle={isRealView ? '真实数据模式下展示草料 serviceRecord 记录' : '演示数据模式下展示模拟巡检记录'}>
      <DataTable columns={['企业名称', '点位/设备名称', '巡检结果', '提交人', '提交时间', '数据来源']}>
        {data.patrolRecords.length === 0 ? <EmptyRow columns={6} text={isRealView ? '暂无真实记录，企业扫码填报后将自动汇总展示。' : '暂无巡检记录'} /> : data.patrolRecords.map(item => (
          <tr key={item.id}><td>{companyName(companies, item.company_id)}</td><td>{item.checkpoint || item.route_name}</td><td><StatusTag value={item.status} /></td><td>{item.inspector || '-'}</td><td>{item.checked_at || '-'}</td><td><SourceTag real={isRealView} /></td></tr>
        ))}
      </DataTable>
    </Panel>
  </ModuleShell>
)

export const TrainingPage = ({ data, overview, companies, isRealView }: PageProps) => (
  <ModuleShell title="培训考试" subtitle="展示安全培训、考试结果、合格率和人员完成情况">
    <section className="pxgov-metric-grid">
      <MetricCard label="培训任务数" value={overview.trainingPeople} />
      <MetricCard label="参与人数" value={overview.trainingPeople} />
      <MetricCard label="已完成人数" value={overview.trainingCompleted} />
      <MetricCard label="未完成人数" value={Math.max(0, overview.trainingPeople - overview.trainingCompleted)} />
      <MetricCard label="合格率" value={`${overview.passRate}%`} />
    </section>
    <Panel title="培训考试记录列表" subtitle={isRealView && data.trainingRecords.length === 0 ? realEmptyText : '只读查看人员完成情况'}>
      <DataTable columns={['企业名称', '培训主题', '参加人员', '完成状态', '考试成绩', '完成时间', '数据来源']}>
        {data.trainingRecords.length === 0 ? <EmptyRow columns={7} text={isRealView ? '暂无真实培训考试记录，企业扫码填报后将自动汇总展示。' : '暂无培训考试记录'} /> : data.trainingRecords.map(item => (
          <tr key={item.id}><td>{companyName(companies, item.company_id)}</td><td>{item.course_name}</td><td>{item.person_name}</td><td><StatusTag value={item.status} /></td><td>{item.score}</td><td>{item.completed_at || '-'}</td><td><SourceTag real={isRealView} /></td></tr>
        ))}
      </DataTable>
    </Panel>
  </ModuleShell>
)

export const CompaniesPage = ({ companies, isRealView }: PageProps) => (
  <ModuleShell title="试点企业运行清单" subtitle="县域试点企业运行总表，支持进入企业只读详情">
    <Panel title="企业列表">
      <CompanyTable companies={companies} isRealView={isRealView} showIds />
    </Panel>
  </ModuleShell>
)

export const CompanyDetailPage = ({ companyId, companies, isRealView }: PageProps & { companyId: string }) => {
  const navigate = useNavigate()
  const item = companies.find(row => row.company.company_id === companyId) || companies.find(row => row.company.company_id === 'unknown-company')

  if (!item) {
    return <ModuleShell title="企业详情" subtitle="未找到对应企业"><EmptyState title="未找到企业" description="请返回企业清单重新选择。" /></ModuleShell>
  }

  return (
    <ModuleShell title={item.company.company_name} subtitle="企业四项闭环运行档案">
      <div className="pxgov-detail-head">
        <div><span>company_id</span><strong>{item.company.company_id}</strong></div>
        <div><span>project_id</span><strong>{item.company.project_id}</strong></div>
        <div><span>county_name</span><strong>平乡县</strong></div>
        <div><span>风险状态</span><StatusTag value={item.runningStatus} /></div>
        <div><span>数据来源</span><SourceTag real={isRealView} /></div>
        <div><span>最近更新时间</span><strong>{item.latestUpdate}</strong></div>
      </div>
      <section className="pxgov-metric-grid">
        <MetricCard label="隐患数量" value={item.hazards.length} />
        <MetricCard label="巡检数量" value={item.patrols.length} />
        <MetricCard label="作业票数量" value={item.permits.length} />
        <MetricCard label="培训考试数量" value={item.trainings.length} />
      </section>
      <div className="pxgov-quick-links">
        <Link to="/gov/pingxiang/hazards">查看隐患闭环</Link>
        <Link to="/gov/pingxiang/work-permits">查看作业票</Link>
        <Link to="/gov/pingxiang/patrols">查看巡检巡查</Link>
        <Link to="/gov/pingxiang/training">查看培训考试</Link>
        <button onClick={() => navigate(-1)}>返回上一层</button>
      </div>
      <section className="pxgov-two-column">
        <Panel title="隐患记录"><SimpleList empty={isRealView ? '暂无真实记录' : '暂无记录'} items={item.hazards.map(row => `${row.title} / ${row.status}`)} /></Panel>
        <Panel title="巡检记录"><SimpleList empty={isRealView ? '暂无真实记录' : '暂无记录'} items={item.patrols.map(row => `${row.checkpoint || row.route_name} / ${row.status}`)} /></Panel>
        <Panel title="作业票记录"><SimpleList empty={isRealView ? '暂无真实记录' : '暂无记录'} items={item.permits.map(row => `${row.permit_type} / ${row.status}`)} /></Panel>
        <Panel title="培训考试记录"><SimpleList empty={isRealView ? '暂无真实记录' : '暂无记录'} items={item.trainings.map(row => `${row.person_name} / ${row.exam_result}`)} /></Panel>
      </section>
    </ModuleShell>
  )
}

export const CompanyTable = ({ companies, isRealView, showIds = false }: { companies: CompanyRuntime[]; isRealView: boolean; showIds?: boolean }) => (
  <DataTable columns={showIds ? ['企业名称', 'company_id', 'project_id', '风险状态', '隐患', '巡检', '作业票', '培训', '最新更新', '数据来源'] : ['企业名称', '风险状态', '隐患数量', '巡检数量', '作业票数量', '培训数量', '数据来源', '查看详情']}>
    {companies.length === 0 ? <EmptyRow columns={showIds ? 10 : 8} text={isRealView ? '暂无真实企业记录' : '暂无企业记录'} /> : companies.map(item => (
      <tr key={item.company.company_id}>
        <td>{item.company.company_name}</td>
        {showIds && <td>{item.company.company_id}</td>}
        {showIds && <td>{item.company.project_id}</td>}
        <td><StatusTag value={item.runningStatus} /></td>
        <td>{item.hazards.length}</td>
        <td>{item.patrols.length}</td>
        <td>{item.permits.length}</td>
        <td>{item.trainings.length}</td>
        {showIds && <td>{item.latestUpdate}</td>}
        <td><SourceTag real={isRealView} /></td>
        {!showIds && <td><Link className="pxgov-detail-btn" to={`/gov/pingxiang/company/${item.company.company_id}`}>查看详情</Link></td>}
      </tr>
    ))}
  </DataTable>
)

const ModuleShell = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="pxgov-page-stack">
    <div className="pxgov-module-title">
      <BackLink to="/gov/pingxiang" />
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
)

const SimpleList = ({ items, empty }: { items: string[]; empty: string }) => (
  items.length === 0 ? <EmptyState title={empty} /> : <div className="pxgov-record-list">{items.map(item => <div key={item}><strong>{item}</strong></div>)}</div>
)
