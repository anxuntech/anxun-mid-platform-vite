import { AlertTriangle, BadgeCheck, CheckCircle2, Circle, QrCode, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { HazardRecord, PatrolRecord, TrainingRecord, WorkPermitRecord } from '../pingxiang-gov/types'
import type { PingxiangDataState } from './visualModel'
import { companyName, formatDateTime } from './visualModel'
import { DataTable, StatusPill } from './VisualComponents'
import { DetailPageShell, DetailSection, EvidenceGallery, InfoGrid, Pager, ProcessTimeline, WideDrawer } from './BusinessComponents'

export type BusinessKind = 'hazard' | 'inspection' | 'permit' | 'training'
export type BusinessRecord = HazardRecord | PatrolRecord | WorkPermitRecord | TrainingRecord

export const recordDisplayId = (record: BusinessRecord) => record.display_id || record.id

export const businessBasePath = (kind: BusinessKind) => kind === 'hazard'
  ? '/gov/pingxiang/hazards'
  : kind === 'inspection'
    ? '/gov/pingxiang/inspections'
    : kind === 'permit'
      ? '/gov/pingxiang/work-permits'
      : '/gov/pingxiang/trainings'

export const businessKindLabel = (kind: BusinessKind) => kind === 'hazard' ? '隐患记录' : kind === 'inspection' ? '巡检记录' : kind === 'permit' ? '作业票' : '培训记录'

export const findBusinessRecord = (state: PingxiangDataState, kind: BusinessKind, id: string): BusinessRecord | undefined => {
  if (kind === 'hazard') return state.data.hazardRecords.find(item => item.id === id)
  if (kind === 'inspection') return state.data.patrolRecords.find(item => item.id === id)
  if (kind === 'permit') return state.data.workPermitRecords.find(item => item.id === id)
  return state.data.trainingRecords.find(item => item.id === id)
}

const recordTitle = (kind: BusinessKind, record: BusinessRecord) => kind === 'hazard'
  ? (record as HazardRecord).title
  : kind === 'inspection'
    ? (record as PatrolRecord).checkpoint
    : kind === 'permit'
      ? `${(record as WorkPermitRecord).permit_type} · ${recordDisplayId(record)}`
      : (record as TrainingRecord).title || (record as TrainingRecord).course_name

const recordStatus = (record: BusinessRecord) => record.status
const recordTime = (kind: BusinessKind, record: BusinessRecord) => kind === 'hazard'
  ? (record as HazardRecord).reported_at
  : kind === 'inspection'
    ? (record as PatrolRecord).checked_at
    : kind === 'permit'
      ? (record as WorkPermitRecord).submitted_at
      : (record as TrainingRecord).started_at || (record as TrainingRecord).completed_at

function HazardContent({ record }: { record: HazardRecord }) {
  return (
    <>
      <DetailSection title="关键结论"><div className="pxv21-conclusion"><AlertTriangle size={24} /><div><strong>{record.title}</strong><p>{record.description || '未提供隐患描述'}</p></div></div></DetailSection>
      <DetailSection title="基础信息"><InfoGrid items={[
        { label: '记录编号', value: recordDisplayId(record) }, { label: '系统记录标识', value: record.id },
        { label: '隐患等级', value: <StatusPill value={`${record.level}风险`} /> },
        { label: '上报人', value: record.reporter }, { label: '上报时间', value: formatDateTime(record.reported_at) },
        { label: '整改责任人', value: record.responsible_person }, { label: '整改期限', value: formatDateTime(record.deadline) },
        { label: '整改内容', value: record.rectification_content }, { label: '复查意见', value: record.review_opinion },
      ]} /></DetailSection>
      <DetailSection title="上报现场照片" note="点击图片可放大查看"><EvidenceGallery files={record.photos} /></DetailSection>
      <DetailSection title="整改结果照片" note="整改提交后形成过程证据"><EvidenceGallery files={record.rectification_photos} emptyText="尚未归集整改照片" /></DetailSection>
      <DetailSection title="闭环流程时间轴"><ProcessTimeline nodes={record.timeline} /></DetailSection>
      {record.linked_patrol_id && <DetailSection title="关联记录"><Link className="pxv21-related-link" to={`/gov/pingxiang/inspections/${record.linked_patrol_id}`}>查看来源巡检记录：{record.linked_patrol_id}</Link></DetailSection>}
    </>
  )
}

function InspectionContent({ record }: { record: PatrolRecord }) {
  return (
    <>
      <DetailSection title="检查结论"><div className={`pxv21-conclusion ${record.abnormal_count ? 'warning' : 'success'}`}><ShieldCheck size={24} /><div><strong>{record.result_summary || record.status}</strong><p>本次共检查 {record.item_count ?? record.items?.length ?? 0} 项，异常 {record.abnormal_count ?? 0} 项。</p></div></div></DetailSection>
      <DetailSection title="巡检基础信息"><InfoGrid items={[
        { label: '记录编号', value: recordDisplayId(record) }, { label: '系统记录标识', value: record.id },
        { label: '巡检点位', value: record.checkpoint },
        { label: '巡检路线', value: record.route_name }, { label: '巡检人', value: record.inspector },
        { label: '巡检时间', value: formatDateTime(record.checked_at) }, { label: '二维码点位', value: <span className="pxv21-inline-icon"><QrCode size={16} />{record.qr_code || '未提供'}</span> },
      ]} /></DetailSection>
      <DetailSection title="逐项检查结果"><div className="pxv21-check-list">{(record.items || []).map(item => <div key={item.id} className={item.result === '正常' ? 'ok' : item.result === '异常' ? 'bad' : 'missing'}>{item.result === '正常' ? <CheckCircle2 /> : <AlertTriangle />}<span><strong>{item.name}</strong><small>{item.note || item.result}</small></span><StatusPill value={item.result} /></div>)}</div></DetailSection>
      <DetailSection title="现场照片"><EvidenceGallery files={record.photos} /></DetailSection>
      <DetailSection title="检查流程"><ProcessTimeline nodes={record.timeline} /></DetailSection>
      {record.linked_hazard_id && <DetailSection title="关联隐患"><Link className="pxv21-related-link" to={`/gov/pingxiang/hazards/${record.linked_hazard_id}`}>查看关联隐患：{record.linked_hazard_id}</Link></DetailSection>}
    </>
  )
}

function PermitContent({ record }: { record: WorkPermitRecord }) {
  return (
    <>
      <DetailSection title="作业关键信息"><InfoGrid items={[
        { label: '作业票号', value: recordDisplayId(record) }, { label: '系统记录标识', value: record.id },
        { label: '作业类型', value: record.permit_type },
        { label: '申请人', value: record.applicant }, { label: '监护人', value: record.guardian },
        { label: '作业地点', value: record.location }, { label: '计划时间', value: `${formatDateTime(record.planned_start)} 至 ${formatDateTime(record.planned_end)}` },
      ]} /></DetailSection>
      <DetailSection title="安全措施" note="逐项展示确认状态"><div className="pxv21-measure-list">{(record.measures || []).map(item => <div key={item.id}>{item.confirmed ? <CheckCircle2 /> : <Circle />}<span>{item.content}</span><StatusPill value={item.confirmed ? '已确认' : '未确认'} /></div>)}</div></DetailSection>
      <DetailSection title="审批链"><div className="pxv21-approval-grid">{(record.approvals || []).map(item => <article key={item.role}><span>{item.role}</span><strong>{item.person}</strong><StatusPill value={item.status} /><p>{item.opinion || '暂无审批意见'}</p><small>{item.time || '时间未提供'}</small></article>)}</div></DetailSection>
      <DetailSection title="现场附件"><EvidenceGallery files={record.attachments} emptyText="未归集作业附件" /></DetailSection>
      <DetailSection title="作业流程"><ProcessTimeline nodes={record.timeline} /></DetailSection>
    </>
  )
}

function TrainingContent({ record, compact = false }: { record: TrainingRecord; compact?: boolean }) {
  const [page, setPage] = useState(1)
  const pageSize = compact ? 5 : 8
  const participants = record.participants || []
  const totalPages = Math.max(1, Math.ceil(participants.length / pageSize))
  const rows = participants.slice((page - 1) * pageSize, page * pageSize)
  const completed = participants.filter(item => item.completed).length
  const examined = participants.filter(item => item.score !== null)
  const passed = examined.filter(item => item.passed).length
  return (
    <>
      <DetailSection title="培训结论"><div className="pxv21-summary-strip"><span><UsersRound />参与<strong>{participants.length}<em>人</em></strong></span><span><BadgeCheck />完成<strong>{completed}<em>人</em></strong></span><span><UserRound />考试<strong>{examined.length}<em>人</em></strong></span><span><CheckCircle2 />合格<strong>{passed}<em>人</em></strong></span></div></DetailSection>
      <DetailSection title="培训基础信息"><InfoGrid items={[
        { label: '培训编号', value: recordDisplayId(record) }, { label: '系统记录标识', value: record.id },
        { label: '培训主题', value: record.title || record.course_name },
        { label: '培训方式', value: record.method }, { label: '开始时间', value: formatDateTime(record.started_at) },
        { label: '组织人', value: record.person_name }, { label: '考试合格线', value: `${record.exam_pass_score ?? 70} 分` },
      ]} /></DetailSection>
      <DetailSection title="参与及考试明细" note={`合格口径：考试成绩不低于 ${record.exam_pass_score ?? 70} 分`}>
        <DataTable headers={['姓名', '参与时间', '学习完成', '考试成绩', '是否合格']} minWidth={680}>
          {rows.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.joined_at}</td><td><StatusPill value={item.completed ? '已完成' : '未完成'} /></td><td>{item.score ?? '未考试'}</td><td><StatusPill value={item.passed === null ? '未考试' : item.passed ? '合格' : '不合格'} /></td></tr>)}
        </DataTable>
        {!compact && <Pager page={page} totalPages={totalPages} total={participants.length} pageSize={pageSize} onPage={setPage} />}
      </DetailSection>
      <DetailSection title="培训附件"><EvidenceGallery files={record.attachments} emptyText="未归集培训附件" /></DetailSection>
      <DetailSection title="培训流程"><ProcessTimeline nodes={record.timeline} /></DetailSection>
    </>
  )
}

export function BusinessRecordContent({ kind, record, compact = false }: { kind: BusinessKind; record: BusinessRecord; compact?: boolean }) {
  if (kind === 'hazard') return <HazardContent record={record as HazardRecord} />
  if (kind === 'inspection') return <InspectionContent record={record as PatrolRecord} />
  if (kind === 'permit') return <PermitContent record={record as WorkPermitRecord} />
  return <TrainingContent record={record as TrainingRecord} compact={compact} />
}

export function BusinessRecordDrawer({ state, kind, record, fromHref }: { state: PingxiangDataState; kind: BusinessKind; record: BusinessRecord; fromHref: string }) {
  const enterprise = companyName(state.companies, record.company_id)
  const fullHref = `${businessBasePath(kind)}/${encodeURIComponent(record.id)}?from=${encodeURIComponent(fromHref)}`
  return <WideDrawer title={recordTitle(kind, record)} enterprise={enterprise} status={recordStatus(record)} time={recordTime(kind, record)} fullHref={fullHref}><BusinessRecordContent kind={kind} record={record} compact /></WideDrawer>
}

export function BusinessRecordDetailPage({ state, kind, record }: { state: PingxiangDataState; kind: BusinessKind; record: BusinessRecord }) {
  const location = useLocation()
  const from = new URLSearchParams(location.search).get('from')
  const backHref = from ? decodeURIComponent(from) : businessBasePath(kind)
  return (
    <DetailPageShell eyebrow={`${businessKindLabel(kind)}完整详情`} title={recordTitle(kind, record)} enterprise={companyName(state.companies, record.company_id)} status={recordStatus(record)} time={recordTime(kind, record)} backHref={backHref}>
      <BusinessRecordContent kind={kind} record={record} />
    </DetailPageShell>
  )
}
