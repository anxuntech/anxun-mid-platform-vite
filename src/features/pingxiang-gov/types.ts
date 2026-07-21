export type PingxiangProjectId = 'pingxiang'
export type PingxiangRole = 'gov_viewer'

export type BaseDemoRecord = {
  project_id: PingxiangProjectId
  company_id: string
  demo_data: boolean
}

export type PilotFeatureKey = 'hazard' | 'workPermit' | 'patrol' | 'training'

export type PilotCompany = BaseDemoRecord & {
  company_name: string
  industry: string
  address: string
  contact_name: string
  contact_phone: string
  enabled: boolean
  enabled_features: Record<PilotFeatureKey, boolean>
  role: PingxiangRole
}

export type HazardStatus = '待整改' | '整改中' | '已整改' | '已复查' | '超期未整改'
export type WorkPermitStatus = '审批中' | '已通过' | '已完成' | '已驳回'
export type PatrolStatus = '正常' | '异常' | '漏检'
export type TrainingStatus = '已完成' | '未完成'
export type ExamResult = '合格' | '不合格'

export type HazardRecord = BaseDemoRecord & {
  id: string
  title: string
  level: '高' | '中' | '低'
  status: HazardStatus
  reported_at: string
  deadline: string
  responsible_person: string
}

export type WorkPermitRecord = BaseDemoRecord & {
  id: string
  permit_type: string
  location: string
  status: WorkPermitStatus
  applicant: string
  submitted_at: string
}

export type PatrolRecord = BaseDemoRecord & {
  id: string
  route_name: string
  checkpoint: string
  status: PatrolStatus
  inspector: string
  checked_at: string
}

export type TrainingRecord = BaseDemoRecord & {
  id: string
  person_name: string
  course_name: string
  status: TrainingStatus
  exam_result: ExamResult
  score: number
  completed_at: string
}
