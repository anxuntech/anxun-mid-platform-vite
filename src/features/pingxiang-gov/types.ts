export type PingxiangProjectId = string
export type PingxiangRole = 'gov_viewer'

export type BaseDemoRecord = {
  project_id: PingxiangProjectId
  company_id: string
  demo_data: boolean
}

export type PilotFeatureKey = 'hazard' | 'workPermit' | 'patrol' | 'training'

export type EvidenceFile = {
  id: string
  name: string
  url?: string
  kind: '现场照片' | '整改照片' | '附件'
  tone?: 'blue' | 'green' | 'orange' | 'violet'
}

export type TimelineNode = {
  id: string
  title: string
  person: string
  time: string
  note: string
  status: 'done' | 'current' | 'pending'
}

export type PilotCompany = BaseDemoRecord & {
  company_name: string
  industry: string
  address: string
  contact_name: string
  contact_phone: string
  enabled: boolean
  enabled_at?: string
  status?: string
  last_effective_at?: string
  enabled_features: Record<PilotFeatureKey, boolean>
  role: PingxiangRole
}

export type HazardStatus = '待整改' | '整改中' | '待复查' | '已销号' | '超期未整改' | '已整改' | '已复查'
export type WorkPermitStatus = '待审批' | '审批中' | '已通过' | '已完成' | '已驳回'
export type PatrolStatus = '正常' | '异常' | '漏检'
export type TrainingStatus = '进行中' | '已完成' | '未完成'
export type ExamResult = '合格' | '不合格' | '未考试'

export type HazardRecord = BaseDemoRecord & {
  id: string
  title: string
  description?: string
  level: '高' | '中' | '低'
  status: HazardStatus
  reporter?: string
  reported_at: string
  deadline: string
  responsible_person: string
  rectification_content?: string
  rectified_at?: string
  reviewer?: string
  review_opinion?: string
  closed_at?: string
  photos?: EvidenceFile[]
  rectification_photos?: EvidenceFile[]
  timeline?: TimelineNode[]
  linked_patrol_id?: string
}

export type PatrolCheckItem = {
  id: string
  name: string
  result: '正常' | '异常' | '未提供'
  note?: string
}

export type WorkPermitApproval = {
  role: string
  person: string
  status: '待审批' | '已通过' | '已驳回'
  time?: string
  opinion?: string
}

export type WorkPermitMeasure = {
  id: string
  content: string
  confirmed: boolean
}

export type WorkPermitRecord = BaseDemoRecord & {
  id: string
  permit_type: string
  location: string
  status: WorkPermitStatus
  applicant: string
  submitted_at: string
  planned_start?: string
  planned_end?: string
  guardian?: string
  approvals?: WorkPermitApproval[]
  measures?: WorkPermitMeasure[]
  attachments?: EvidenceFile[]
  completed_at?: string
  timeline?: TimelineNode[]
}

export type PatrolRecord = BaseDemoRecord & {
  id: string
  route_name: string
  checkpoint: string
  status: PatrolStatus
  inspector: string
  checked_at: string
  item_count?: number
  abnormal_count?: number
  result_summary?: string
  items?: PatrolCheckItem[]
  photos?: EvidenceFile[]
  linked_hazard_id?: string
  qr_code?: string
  planned_count?: number
  completed_count?: number
  timeline?: TimelineNode[]
}

export type TrainingParticipant = {
  id: string
  name: string
  joined_at: string
  completed: boolean
  score: number | null
  passed: boolean | null
}

export type TrainingRecord = BaseDemoRecord & {
  id: string
  person_name: string
  course_name: string
  title?: string
  method?: string
  status: TrainingStatus
  exam_result: ExamResult
  score: number
  started_at?: string
  completed_at: string
  participants?: TrainingParticipant[]
  exam_pass_score?: number
  attachments?: EvidenceFile[]
  timeline?: TimelineNode[]
}
