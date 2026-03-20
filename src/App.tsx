import { useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useEffect } from 'react'
import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Factory,
  FileWarning,
  Gauge,
  Landmark,
  LayoutGrid,
  LineChart,
  MapPinned,
  Monitor,
  PanelRightOpen,
  Radio,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import { buildAppHref, parseAppLocation } from './navigation'

type Perspective = '企业' | '安全服务商' | '保险平台' | '应急局'
type PageKey = 'dashboard' | 'enterprises' | 'detail' | 'scoreDetail' | 'scoreTrend' | 'scoreConfig' | 'hazards' | 'devices' | 'tasks' | 'users' | 'bigscreen'
type Level = 'A' | 'B' | 'C' | 'D'
type Risk = '高' | '中' | '低'
type HazardStatus = '待整改' | '整改中' | '待复查' | '已闭环'
type DeviceStatus = '在线' | '离线' | '告警'
type TaskStage = '待指派' | '待接单' | '执行中' | '待验收' | '已完成'
type TaskPriority = '高' | '中' | '低'
type InsuranceStatus = '在保' | '续保跟进' | '待核保'
type TaskListScope = 'all' | 'today' | 'weekCompleted' | 'monthly'
type HazardListScope = 'all' | 'pendingReview' | 'overdueOpen'
type UnifiedTaskStatus = '待执行' | '执行中' | '已发现隐患' | '待整改' | '待复查' | '已闭环' | '已超期'
type TaskTimeFilter = 'all' | 'last7days' | 'thisMonth' | 'next7days'
type TaskQuickFilter = 'all' | 'overdue' | 'pendingReview'
type Tone = 'red' | 'amber' | 'emerald' | 'blue' | 'slate' | 'violet' | 'cyan'
type StatPeriod = '按月' | '按季度'
type CalcMethod = 'threshold' | 'range' | 'deduction' | 'weight'
type SchemeStatus = '启用' | '草稿'
type AppRouteState = {
  page: PageKey
  enterpriseId?: string
  taskId?: string
  taskListScope?: TaskListScope
  hazardListScope?: HazardListScope
  hazardEnterpriseId?: string
  taskEnterpriseFilter?: string
  taskTypeFilter?: string
  taskStatusFilter?: UnifiedTaskStatus | 'all'
  taskPriorityFilter?: TaskPriority | 'all'
  taskTimeFilter?: TaskTimeFilter
  taskAssigneeFilter?: string
  taskQuickFilter?: TaskQuickFilter
  selectedMonth?: string
  detailSnapshotMonth?: string
  selectedHazardId?: string
  hazardLevelFilter?: string
  hazardStatusFilter?: string
  hazardReviewFilter?: string
  hazardOverdueFilter?: string
  hazardTimeFilter?: string
  hazardKeyword?: string
  hazardQuickFilter?: string
  selectedSnapshotId?: string
  snapshotEnterpriseFilter?: string
  snapshotRiskFilter?: string
  selectedRecordId?: string
  recordEnterpriseFilter?: string
  recordTypeFilter?: string
  recordExecutorFilter?: string
  recordTimeFilter?: string
  recordStatusFilter?: string
  recordQuickFilter?: string
}

type Enterprise = { id: string; name: string; industry: string; area: string; leader: string; phone: string; score: number; level: Level; risk: Risk; tags: string[]; deviceCount: number }
type Hazard = { id: string; enterpriseId: string; title: string; level: Risk; status: HazardStatus; source: string; foundAt: string; deadline: string }
type Device = { id: string; enterpriseId: string; name: string; type: string; location: string; status: DeviceStatus; heartbeat: string }
type SurveyTask = { id: string; enterpriseId: string; enterpriseName: string; type: string; stage: TaskStage; progress: number; assignee: string; createdBy: string; dueDate: string; focus: string }
type Approval = { id: string; enterpriseId: string; title: string; submitter: string; node: string; status: '待内部审批' | '审批中' | '待提交材料'; dueDate: string }
type UserItem = { id: string; name: string; org: string; role: string; scope: string; group: Perspective; status: '启用'; lastLogin: string }
type ScoreScheme = { id: string; name: string; version: string; status: SchemeStatus; description: string; effectiveFrom: string; snapshotPolicy: 'immutable' }
type ScoreDimension = { id: string; schemeId: string; code: string; name: string; weight: number; order: number; note: string }
type ScoreRuleBand = { min?: number; max?: number; score: number; label: string }
type ScoreRule = { id: string; schemeId: string; dimensionId: string; name: string; metricCode: string; dataSourceField: string; sourceTable: string; sourceApiField: string; statPeriod: StatPeriod; calcMethod: CalcMethod; maxScore: number; enabled: boolean; enterpriseTypes: string[]; scoreDirection: 'asc' | 'desc'; note: string; bands?: ScoreRuleBand[]; threshold?: number; weightRatio?: number; deltaStep?: number }
type ScoreLevelRange = { id: string; schemeId: string; name: string; min: number; max: number; color: Tone; description: string }
type DeductionDetail = { id: string; ruleId: string; ruleName: string; dimensionId: string; dimensionName: string; metricCode: string; dataSourceField: string; sourceTable: string; sourceApiField: string; calcMethod: CalcMethod; actualValue: string; maxScore: number; score: number; deducted: number; reason: string }
type DimensionScore = { dimensionId: string; dimensionName: string; fullScore: number; score: number; deductions: number }
type ScoreSnapshot = { id: string; schemeId: string; enterpriseId: string; enterpriseName: string; month: string; generatedAt: string; locked: boolean; totalScore: number; levelName: string; levelColor: Tone; metrics: Record<string, number | string>; dimensionScores: DimensionScore[]; deductionDetails: DeductionDetail[] }
type TaskExecutionRecord = { id: string; time: string; actor: string; action: string; note: string }
type TaskEvidenceFile = { id: string; title: string; category: '现场图片' | '过程记录' | '整改证明'; time: string; description: string }
type UploadedTaskEvidence = { id: string; title: string; time: string; previewUrl: string; description: string }
type PortraitServiceRecord = { id: string; serviceType: string; time: string; executor: string; summary: string; status: string; relatedTaskId: string }
type PortraitMonthlySnapshot = { month: string; score: number; levelName: string; levelColor: Tone; riskLevel: Risk; closedRate: number; note: string; serviceSummary: string; hazardChange: string; keyActions: string[]; openHazardCount: number; overdueHazardCount: number }
type TaskCenterItem = {
  taskId: string
  taskCode: string
  taskName: string
  enterpriseId: string
  enterpriseName: string
  taskType: string
  source: string
  assignTime: string
  dueTime: string
  assignee: string
  status: UnifiedTaskStatus
  priority: TaskPriority
  taskDescription: string
  currentProgress: string
  progressPercent: number
  executionRecords: TaskExecutionRecord[]
  evidenceFiles: TaskEvidenceFile[]
  hazardFound: boolean
  hazardCount: number
  rectificationStatus: string
  reviewStatus: string
  relatedHazardIds: string[]
  latestAction: string
}

const enterprises: Enterprise[] = [
  { id: 'ent-001', name: '邢台荣泰机械制造有限公司', industry: '机械制造', area: '开发区', leader: '张总', phone: '13800001111', score: 72, level: 'C', risk: '高', tags: ['焊接', '配电室', '仓储'], deviceCount: 18 },
  { id: 'ent-002', name: '邢台新源注塑包装有限公司', industry: '注塑包装', area: '信都区', leader: '王经理', phone: '13800002222', score: 61, level: 'D', risk: '高', tags: ['注塑机', '空压机', '仓储'], deviceCount: 12 },
  { id: 'ent-003', name: '邢台恒安仓储服务有限公司', industry: '仓储物流', area: '襄都区', leader: '李主任', phone: '13800003333', score: 86, level: 'B', risk: '中', tags: ['仓储', '叉车', '消防泵房'], deviceCount: 7 },
  { id: 'ent-004', name: '邢台广信食品有限公司', industry: '食品加工', area: '南和区', leader: '赵厂长', phone: '13800004444', score: 93, level: 'A', risk: '低', tags: ['冷库', '包装线', '配电室'], deviceCount: 20 },
  { id: 'ent-005', name: '河北耀成铸造有限公司', industry: '金属加工', area: '任泽区', leader: '刘总', phone: '13800005555', score: 68, level: 'C', risk: '高', tags: ['熔炼', '配电室', '除尘'], deviceCount: 15 },
  { id: 'ent-006', name: '河北盛德纺织科技有限公司', industry: '纺织服装', area: '柏乡县', leader: '孙经理', phone: '13800006666', score: 82, level: 'B', risk: '中', tags: ['织机', '仓储', '宿舍'], deviceCount: 11 },
  { id: 'ent-007', name: '河北启航橡塑制品有限公司', industry: '橡塑制品', area: '清河县', leader: '马总', phone: '13800007777', score: 64, level: 'D', risk: '高', tags: ['炼胶', '压延', '仓储'], deviceCount: 14 },
  { id: 'ent-008', name: '河北丰辰电气设备有限公司', industry: '电气装配', area: '隆尧县', leader: '周总', phone: '13800008888', score: 88, level: 'B', risk: '中', tags: ['总装', '实验区', '仓储'], deviceCount: 9 },
  { id: 'ent-009', name: '邢台绿洲包装材料有限公司', industry: '包装印刷', area: '巨鹿县', leader: '何厂长', phone: '13800009999', score: 76, level: 'C', risk: '中', tags: ['印刷', '油墨', '成品库'], deviceCount: 10 },
  { id: 'ent-010', name: '河北华川医养设备有限公司', industry: '医疗器械', area: '宁晋县', leader: '崔总', phone: '13800010000', score: 90, level: 'A', risk: '低', tags: ['洁净车间', '仓储', '实验室'], deviceCount: 13 },
  { id: 'ent-011', name: '河北同创汽车零部件有限公司', industry: '汽车零部件', area: '沙河市', leader: '高经理', phone: '13800011110', score: 79, level: 'B', risk: '中', tags: ['冲压', '焊接', '喷涂'], deviceCount: 17 },
  { id: 'ent-012', name: '河北安晟新能源科技有限公司', industry: '新能源制造', area: '内丘县', leader: '冯总', phone: '13800012220', score: 66, level: 'C', risk: '高', tags: ['储能', 'PACK', '充放电'], deviceCount: 16 },
]

const opsMap: Record<string, { safety: number; fire: number; pending: number; onTime: number; coverage: number }> = {
  'ent-001': { safety: 22, fire: 48, pending: 3, onTime: 75, coverage: 92 }, 'ent-002': { safety: 14, fire: 30, pending: 5, onTime: 63, coverage: 84 }, 'ent-003': { safety: 18, fire: 36, pending: 0, onTime: 96, coverage: 95 }, 'ent-004': { safety: 24, fire: 50, pending: 0, onTime: 100, coverage: 98 },
  'ent-005': { safety: 17, fire: 32, pending: 4, onTime: 70, coverage: 87 }, 'ent-006': { safety: 19, fire: 42, pending: 1, onTime: 92, coverage: 93 }, 'ent-007': { safety: 15, fire: 28, pending: 5, onTime: 61, coverage: 81 }, 'ent-008': { safety: 20, fire: 40, pending: 1, onTime: 95, coverage: 96 },
  'ent-009': { safety: 16, fire: 34, pending: 2, onTime: 84, coverage: 90 }, 'ent-010': { safety: 23, fire: 47, pending: 0, onTime: 99, coverage: 98 }, 'ent-011': { safety: 18, fire: 37, pending: 2, onTime: 88, coverage: 91 }, 'ent-012': { safety: 16, fire: 31, pending: 4, onTime: 73, coverage: 86 },
}

const hazards: Hazard[] = [
  { id: 'haz-001', enterpriseId: 'ent-001', title: '车间配电箱前堆放杂物', level: '高', status: '整改中', source: '企业巡检上报', foundAt: '2026-03-09 10:12', deadline: '2026-03-16' },
  { id: 'haz-002', enterpriseId: 'ent-001', title: '灭火器月检记录缺失', level: '中', status: '待复查', source: '安全服务商复检', foundAt: '2026-03-08 11:40', deadline: '2026-03-15' },
  { id: 'haz-003', enterpriseId: 'ent-002', title: '仓储区疏散通道占用', level: '高', status: '待整改', source: '企业隐患上报', foundAt: '2026-03-12 15:22', deadline: '2026-03-17' },
  { id: 'haz-004', enterpriseId: 'ent-003', title: '巡检点位漏检 1 次', level: '低', status: '已闭环', source: '系统自动识别', foundAt: '2026-03-07 08:30', deadline: '2026-03-10' },
  { id: 'haz-005', enterpriseId: 'ent-002', title: '注塑机周边电缆防护不足', level: '高', status: '整改中', source: '安全服务商复查', foundAt: '2026-03-13 14:15', deadline: '2026-03-18' },
  { id: 'haz-006', enterpriseId: 'ent-005', title: '熔炼区可燃物清理不到位', level: '高', status: '待整改', source: '专项检查', foundAt: '2026-03-13 11:05', deadline: '2026-03-19' },
  { id: 'haz-007', enterpriseId: 'ent-006', title: '宿舍疏散指示灯异常', level: '中', status: '整改中', source: '企业巡检上报', foundAt: '2026-03-11 09:48', deadline: '2026-03-18' },
  { id: 'haz-008', enterpriseId: 'ent-007', title: '炼胶车间粉尘清理频次不足', level: '高', status: '待复查', source: '安全服务商复查', foundAt: '2026-03-12 16:20', deadline: '2026-03-18' },
  { id: 'haz-009', enterpriseId: 'ent-008', title: '实验区灭火器摆放偏移', level: '低', status: '已闭环', source: '系统自动识别', foundAt: '2026-03-10 14:10', deadline: '2026-03-11' },
  { id: 'haz-010', enterpriseId: 'ent-009', title: '油墨库防静电接地记录缺失', level: '中', status: '整改中', source: '保险平台风勘', foundAt: '2026-03-15 10:20', deadline: '2026-03-21' },
  { id: 'haz-011', enterpriseId: 'ent-011', title: '喷涂线周边消防水带老化', level: '中', status: '待整改', source: '企业巡检上报', foundAt: '2026-03-12 12:16', deadline: '2026-03-20' },
  { id: 'haz-012', enterpriseId: 'ent-012', title: 'PACK 区异常温升处置时效慢', level: '高', status: '整改中', source: '设备告警联动', foundAt: '2026-03-15 08:42', deadline: '2026-03-19' },
]

const devices: Device[] = [
  { id: 'dev-001', enterpriseId: 'ent-001', name: '1 号车间烟感', type: '烟感', location: '1 号车间东侧', status: '在线', heartbeat: '2026-03-15 14:12' },
  { id: 'dev-002', enterpriseId: 'ent-001', name: '配电室温度传感器', type: '温感', location: '配电室', status: '告警', heartbeat: '2026-03-15 14:11' },
  { id: 'dev-003', enterpriseId: 'ent-002', name: '仓储区 AI 摄像头', type: 'AI 摄像头', location: '仓储区北门', status: '在线', heartbeat: '2026-03-15 14:10' },
  { id: 'dev-004', enterpriseId: 'ent-003', name: '消防水压传感器', type: '水压', location: '泵房', status: '离线', heartbeat: '2026-03-15 09:00' },
  { id: 'dev-005', enterpriseId: 'ent-002', name: '注塑车间温度传感器', type: '温感', location: '注塑车间', status: '告警', heartbeat: '2026-03-15 13:50' },
  { id: 'dev-006', enterpriseId: 'ent-005', name: '熔炼区烟温复合探测器', type: '复合探测', location: '熔炼车间', status: '在线', heartbeat: '2026-03-15 14:02' },
  { id: 'dev-007', enterpriseId: 'ent-006', name: '宿舍区应急照明网关', type: '网关', location: '宿舍楼', status: '在线', heartbeat: '2026-03-15 14:05' },
  { id: 'dev-008', enterpriseId: 'ent-007', name: '炼胶区粉尘监测', type: '粉尘传感', location: '炼胶车间', status: '告警', heartbeat: '2026-03-15 13:58' },
  { id: 'dev-009', enterpriseId: 'ent-010', name: '洁净车间压差传感器', type: '压差', location: '洁净车间', status: '在线', heartbeat: '2026-03-15 14:08' },
  { id: 'dev-010', enterpriseId: 'ent-012', name: 'PACK 区热成像摄像头', type: '热成像', location: 'PACK 区', status: '告警', heartbeat: '2026-03-15 14:01' },
]

const initialSurveyTasks: SurveyTask[] = [
  { id: 'sur-001', enterpriseId: 'ent-002', enterpriseName: '邢台新源注塑包装有限公司', type: '续保前风勘', stage: '待接单', progress: 10, assignee: '安巡安全服务机构 B 组', createdBy: '陈经理 / 保险平台', dueDate: '2026-03-20', focus: '突出风险复核 + 续保资料补齐' },
  { id: 'sur-002', enterpriseId: 'ent-003', enterpriseName: '邢台恒安仓储服务有限公司', type: '专项复勘', stage: '待验收', progress: 90, assignee: '安巡安全服务机构 A 组', createdBy: '陈经理 / 保险平台', dueDate: '2026-03-17', focus: '设备异常专项复勘' },
  { id: 'sur-003', enterpriseId: 'ent-005', enterpriseName: '河北耀成铸造有限公司', type: '首保前风勘', stage: '待指派', progress: 0, assignee: '待指派', createdBy: '刘经理 / 保险平台', dueDate: '2026-03-21', focus: '熔炼区域火灾风险摸底' },
  { id: 'sur-004', enterpriseId: 'ent-007', enterpriseName: '河北启航橡塑制品有限公司', type: '专项复勘', stage: '执行中', progress: 55, assignee: '安巡安全服务机构 C 组', createdBy: '陈经理 / 保险平台', dueDate: '2026-03-19', focus: '炼胶区域粉尘与防火间距复勘' },
]

const initialApprovals: Approval[] = [
  { id: 'ep-001', enterpriseId: 'ent-001', title: '配电箱前杂物清理整改申请', submitter: '车间主任', node: '安全负责人审批', status: '待内部审批', dueDate: '2026-03-16' },
  { id: 'ep-002', enterpriseId: 'ent-002', title: '疏散通道整改费用确认', submitter: '行政主管', node: '企业负责人确认', status: '审批中', dueDate: '2026-03-18' },
  { id: 'ep-003', enterpriseId: 'ent-002', title: '整改闭环证明提交', submitter: '设备管理员', node: '待提交闭环证明', status: '待提交材料', dueDate: '2026-03-17' },
  { id: 'ep-004', enterpriseId: 'ent-012', title: '热成像告警处置复盘申请', submitter: '储能车间主管', node: '安全负责人审批', status: '待内部审批', dueDate: '2026-03-19' },
]

const initialServiceRecords = [
  { id: 'sr-001', enterpriseId: 'ent-002', serviceType: '续保前风勘', provider: '安巡安全服务机构 B 组', date: '2026-03-14', result: '已到场排查并形成初步意见', status: '执行中' },
  { id: 'sr-002', enterpriseId: 'ent-003', serviceType: '专项复勘', provider: '安巡安全服务机构 A 组', date: '2026-03-15', result: '报告已提交，待保险平台验收', status: '待验收' },
  { id: 'sr-003', enterpriseId: 'ent-001', serviceType: '风勘回访', provider: '安巡安全服务机构 A 组', date: '2026-03-12', result: '完成回访并补齐部分影像资料', status: '已完成' },
  { id: 'sr-004', enterpriseId: 'ent-007', serviceType: '专项复勘', provider: '安巡安全服务机构 C 组', date: '2026-03-16', result: '现场执行中，等待补充影像资料', status: '执行中' },
]

const users: UserItem[] = [
  { id: 'usr-001', name: '王经理', org: '邢台新源注塑包装有限公司', role: '企业负责人', scope: '本企业', group: '企业', status: '启用', lastLogin: '2026-03-14 18:15' },
  { id: 'usr-002', name: '赵主管', org: '邢台荣泰机械制造有限公司', role: '安全员', scope: '本企业', group: '企业', status: '启用', lastLogin: '2026-03-15 08:05' },
  { id: 'usr-003', name: '李工', org: '安巡安全服务机构', role: '风勘工程师', scope: '分配企业', group: '安全服务商', status: '启用', lastLogin: '2026-03-15 07:58' },
  { id: 'usr-004', name: '陈经理', org: '保险平台 A', role: '平台管理员', scope: '全量企业', group: '保险平台', status: '启用', lastLogin: '2026-03-15 09:26' },
  { id: 'usr-005', name: '刘科长', org: '应急管理部门', role: '监管查看员', scope: '重点企业监管', group: '应急局', status: '启用', lastLogin: '2026-03-15 08:40' },
]

const privacyRules = [
  { audience: '企业', visible: '本企业评分详情、整改台账、内部审批', hidden: '其他企业数据' },
  { audience: '安全服务商', visible: '被分配任务、必要隐患与设备状态', hidden: '企业内部制度全文' },
  { audience: '保险平台', visible: '配置页、快照、趋势、任务结果', hidden: '无关经营数据' },
  { audience: '应急局', visible: '重点风险、快照历史、整改留痕', hidden: '内部审批细节' },
]

const months = ['2026-01', '2026-02', '2026-03', '2026-04']

const initialSchemes: ScoreScheme[] = [
  { id: 'scheme-v1', name: '安巡试用版评分方案', version: 'v1.0', status: '启用', description: '覆盖巡检、隐患、设备与协同留痕。', effectiveFrom: '2026-03-01', snapshotPolicy: 'immutable' },
  { id: 'scheme-v1-beta', name: '安巡试用版评分方案（草稿）', version: 'v1.1-beta', status: '草稿', description: '预留更多接口字段。', effectiveFrom: '2026-04-01', snapshotPolicy: 'immutable' },
]

const initialDimensions: ScoreDimension[] = [
  { id: 'dim-inspect', schemeId: 'scheme-v1', code: 'DIM_INSPECT', name: '巡检执行', weight: 30, order: 1, note: '覆盖率与频次' },
  { id: 'dim-hazard', schemeId: 'scheme-v1', code: 'DIM_HAZARD', name: '隐患整改', weight: 35, order: 2, note: '高风险隐患与整改按期率' },
  { id: 'dim-device', schemeId: 'scheme-v1', code: 'DIM_DEVICE', name: '设备设施', weight: 20, order: 3, note: '设备在线率与告警压力' },
  { id: 'dim-collab', schemeId: 'scheme-v1', code: 'DIM_COLLAB', name: '协同留痕', weight: 15, order: 4, note: '服务回传与审批阻塞' },
]

const initialRules: ScoreRule[] = [
  { id: 'r1', schemeId: 'scheme-v1', dimensionId: 'dim-inspect', name: '巡检覆盖率', metricCode: 'inspectionCoverage', dataSourceField: 'ops.coverage', sourceTable: 'ops_monthly_summary', sourceApiField: 'inspection_coverage', statPeriod: '按月', calcMethod: 'threshold', maxScore: 18, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'asc', note: '覆盖率越高越好', threshold: 95 },
  { id: 'r2', schemeId: 'scheme-v1', dimensionId: 'dim-inspect', name: '巡检频次', metricCode: 'inspectionCount', dataSourceField: 'ops.safety', sourceTable: 'ops_monthly_summary', sourceApiField: 'safety_inspection_count', statPeriod: '按月', calcMethod: 'weight', maxScore: 12, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'asc', note: '按次数加权', weightRatio: 0.6 },
  { id: 'r3', schemeId: 'scheme-v1', dimensionId: 'dim-hazard', name: '高风险隐患控制', metricCode: 'highHazardCount', dataSourceField: 'hazards.level=高', sourceTable: 'hazard_records', sourceApiField: 'high_hazard_count', statPeriod: '按月', calcMethod: 'range', maxScore: 18, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'desc', note: '高风险隐患越少越好', bands: [{ max: 0, score: 18, label: '无高风险隐患' }, { min: 1, max: 1, score: 14, label: '1 项高风险隐患' }, { min: 2, max: 2, score: 10, label: '2 项高风险隐患' }, { min: 3, score: 4, label: '3 项及以上高风险隐患' }] },
  { id: 'r4', schemeId: 'scheme-v1', dimensionId: 'dim-hazard', name: '整改按期率', metricCode: 'rectificationOnTimeRate', dataSourceField: 'ops.onTime', sourceTable: 'ops_monthly_summary', sourceApiField: 'rectification_on_time_rate', statPeriod: '按月', calcMethod: 'threshold', maxScore: 12, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'asc', note: '按期率达到阈值给满分', threshold: 90 },
  { id: 'r5', schemeId: 'scheme-v1', dimensionId: 'dim-hazard', name: '待整改积压', metricCode: 'pendingHazardCount', dataSourceField: 'ops.pending', sourceTable: 'ops_monthly_summary', sourceApiField: 'pending_hazard_count', statPeriod: '按月', calcMethod: 'deduction', maxScore: 5, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'desc', note: '积压越多扣分越多', deltaStep: 1 },
  { id: 'r6', schemeId: 'scheme-v1', dimensionId: 'dim-device', name: '设备在线率', metricCode: 'deviceOnlineRate', dataSourceField: 'devices.status', sourceTable: 'iot_device_status', sourceApiField: 'device_online_rate', statPeriod: '按月', calcMethod: 'threshold', maxScore: 12, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'asc', note: '在线率用于衡量基础设施稳定性', threshold: 92 },
  { id: 'r7', schemeId: 'scheme-v1', dimensionId: 'dim-device', name: '告警处置压力', metricCode: 'abnormalDeviceCount', dataSourceField: 'devices.status!=在线', sourceTable: 'iot_device_status', sourceApiField: 'abnormal_device_count', statPeriod: '按月', calcMethod: 'range', maxScore: 8, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'desc', note: '异常设备越少越好', bands: [{ max: 0, score: 8, label: '无异常设备' }, { min: 1, max: 1, score: 6, label: '1 台异常设备' }, { min: 2, max: 2, score: 4, label: '2 台异常设备' }, { min: 3, score: 1, label: '3 台及以上异常设备' }] },
  { id: 'r8', schemeId: 'scheme-v1', dimensionId: 'dim-collab', name: '服务回传完整度', metricCode: 'serviceRecordCount', dataSourceField: 'serviceRecords.count', sourceTable: 'service_records', sourceApiField: 'service_record_count', statPeriod: '按月', calcMethod: 'weight', maxScore: 8, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'asc', note: '服务回传记录越充分越好', weightRatio: 2 },
  { id: 'r9', schemeId: 'scheme-v1', dimensionId: 'dim-collab', name: '内部审批阻塞', metricCode: 'approvalPendingCount', dataSourceField: 'approvals.status', sourceTable: 'approval_flow', sourceApiField: 'approval_pending_count', statPeriod: '按月', calcMethod: 'deduction', maxScore: 7, enabled: true, enterpriseTypes: ['通用'], scoreDirection: 'desc', note: '待审批和待材料越多越扣分', deltaStep: 1 },
]

const initialLevelRanges: ScoreLevelRange[] = [
  { id: 'l1', schemeId: 'scheme-v1', name: '优秀', min: 90, max: 100, color: 'emerald', description: '风险控制较优' },
  { id: 'l2', schemeId: 'scheme-v1', name: '良好', min: 80, max: 89.99, color: 'blue', description: '基础较稳' },
  { id: 'l3', schemeId: 'scheme-v1', name: '关注', min: 70, max: 79.99, color: 'amber', description: '存在短板需跟踪' },
  { id: 'l4', schemeId: 'scheme-v1', name: '高风险', min: 0, max: 69.99, color: 'red', description: '需重点整改' },
]

const perspectives = [
  { key: '企业' as Perspective, label: '企业', icon: Briefcase },
  { key: '安全服务商' as Perspective, label: '安全服务商', icon: Wrench },
  { key: '保险平台' as Perspective, label: '保险平台', icon: Landmark },
  { key: '应急局' as Perspective, label: '应急局', icon: Shield },
]

const navItems = [
  { key: 'dashboard' as PageKey, label: '总览首页', icon: Gauge },
  { key: 'enterprises' as PageKey, label: '企业列表', icon: Building2 },
  { key: 'detail' as PageKey, label: '企业画像', icon: Factory },
  { key: 'scoreDetail' as PageKey, label: '月度快照', icon: Calculator },
  { key: 'scoreTrend' as PageKey, label: '评分趋势', icon: LineChart },
  { key: 'scoreConfig' as PageKey, label: '评分机制配置', icon: Settings2 },
  { key: 'hazards' as PageKey, label: '隐患闭环', icon: FileWarning },
  { key: 'devices' as PageKey, label: '数据台账', icon: Radio },
  { key: 'tasks' as PageKey, label: '任务中心', icon: ClipboardCheck },
  { key: 'users' as PageKey, label: '人员管理', icon: Users },
  { key: 'bigscreen' as PageKey, label: '演示总览', icon: Monitor },
]

const toneMap: Record<Tone, string> = { red: 'badge-red', amber: 'badge-amber', emerald: 'badge-emerald', blue: 'badge-blue', slate: 'badge-slate', violet: 'badge-violet', cyan: 'badge-cyan' }
const cn = (...v: Array<string | false | undefined | null>) => v.filter(Boolean).join(' ')
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round = (v: number) => Number(v.toFixed(2))
const entType = (ent: Enterprise) => (ent.industry.includes('仓储') ? '仓储物流' : ent.industry.includes('新能源') ? '新能源制造' : '制造业')
const bias = (m: string) => ({ '2026-01': -2, '2026-02': -1, '2026-03': 0, '2026-04': 1 }[m] ?? 0)
const defaultEnterpriseId = 'ent-002'
const taskStatusOrder: UnifiedTaskStatus[] = ['待执行', '执行中', '已发现隐患', '待整改', '待复查', '已闭环', '已超期']
const taskStatusTone: Record<UnifiedTaskStatus, Tone> = { 待执行: 'slate', 执行中: 'blue', 已发现隐患: 'amber', 待整改: 'amber', 待复查: 'violet', 已闭环: 'emerald', 已超期: 'red' }
const insuranceStatusMap: Record<string, InsuranceStatus> = { 'ent-001': '续保跟进', 'ent-002': '在保', 'ent-003': '在保', 'ent-004': '在保', 'ent-005': '续保跟进', 'ent-006': '在保', 'ent-007': '待核保', 'ent-008': '在保', 'ent-009': '续保跟进', 'ent-010': '在保', 'ent-011': '在保', 'ent-012': '续保跟进' }
const insuranceStatusTone: Record<InsuranceStatus, Tone> = { 在保: 'emerald', 续保跟进: 'amber', 待核保: 'slate' }
const surveyAssignTimeMap: Record<string, string> = {
  'sur-001': '2026-03-14 09:20',
  'sur-002': '2026-03-11 15:40',
  'sur-003': '2026-03-15 10:10',
  'sur-004': '2026-03-13 08:35',
}
const serviceAssignTimeMap: Record<string, string> = {
  'sr-001': '2026-03-14 13:30',
  'sr-002': '2026-03-15 10:15',
  'sr-003': '2026-03-12 09:00',
  'sr-004': '2026-03-16 08:50',
}
const taskTimeFilterLabels: Record<TaskTimeFilter, string> = { all: '全部时间', last7days: '近 7 天', thisMonth: '本月', next7days: '未来 7 天' }
const taskQuickFilterLabels: Record<TaskQuickFilter, string> = { all: '全部任务', overdue: '只看超期', pendingReview: '只看待复查' }

function metricsFor(ent: Enterprise, month: string, approvals: Approval[]) {
  const b = bias(month)
  const hz = hazards.filter(h => h.enterpriseId === ent.id)
  const dv = devices.filter(d => d.enterpriseId === ent.id)
  const online = dv.filter(d => d.status === '在线').length
  return {
    inspectionCoverage: clamp(opsMap[ent.id].coverage + b * 2, 60, 100),
    inspectionCount: Math.max(6, opsMap[ent.id].safety + b * 2),
    highHazardCount: Math.max(0, hz.filter(h => h.level === '高' && h.status !== '已闭环').length - b),
    rectificationOnTimeRate: clamp(opsMap[ent.id].onTime + b * 3, 55, 100),
    pendingHazardCount: Math.max(0, opsMap[ent.id].pending - b),
    deviceOnlineRate: clamp(Math.round((Math.max(1, online + b) / Math.max(1, dv.length)) * 100), 60, 100),
    abnormalDeviceCount: Math.max(0, dv.filter(d => d.status !== '在线').length - b),
    serviceRecordCount: Math.max(0, initialServiceRecords.filter(r => r.enterpriseId === ent.id).length + b),
    approvalPendingCount: Math.max(0, approvals.filter(a => a.enterpriseId === ent.id && a.status !== '审批中').length - Math.max(0, b)),
  }
}

function scoreRule(rule: ScoreRule, value: number) {
  if (rule.calcMethod === 'threshold') {
    const threshold = rule.threshold ?? 100
    const score = rule.scoreDirection === 'asc' ? round(rule.maxScore * clamp(value / threshold, 0, 1)) : round(rule.maxScore * clamp(threshold / Math.max(value, 1), 0, 1))
    return { score, reason: `阈值 ${threshold}` }
  }
  if (rule.calcMethod === 'range') {
    const band = rule.bands?.find(item => (item.min === undefined || value >= item.min) && (item.max === undefined || value <= item.max))
    return { score: band?.score ?? 0, reason: band?.label || '未命中区间' }
  }
  if (rule.calcMethod === 'deduction') {
    const deducted = Math.min(rule.maxScore, Math.floor(value / Math.max(1, rule.deltaStep ?? 1)))
    return { score: Math.max(0, rule.maxScore - deducted), reason: '按单位扣分' }
  }
  return { score: clamp(round(value * (rule.weightRatio ?? 1)), 0, rule.maxScore), reason: '按权重换算' }
}

function levelOf(score: number, ranges: ScoreLevelRange[]) {
  return ranges.find(item => score >= item.min && score <= item.max) || ranges[ranges.length - 1] || { id: 'fallback', schemeId: 'fallback', name: '未配置', min: 0, max: 100, color: 'slate' as Tone, description: '请先配置等级区间' }
}

function snapshotFor(schemeId: string, ent: Enterprise, month: string, approvals: Approval[], dimensions: ScoreDimension[], rules: ScoreRule[], ranges: ScoreLevelRange[]): ScoreSnapshot {
  const metrics = metricsFor(ent, month, approvals)
  const appliedRules = rules.filter(rule => rule.enabled && (rule.enterpriseTypes.includes('通用') || rule.enterpriseTypes.includes(entType(ent))))
  const dimensionScores = dimensions.slice().sort((a, b) => a.order - b.order).map(dimension => {
    const rows = appliedRules.filter(rule => rule.dimensionId === dimension.id)
    const fullScore = rows.reduce((sum, rule) => sum + rule.maxScore, 0)
    const score = round(rows.reduce((sum, rule) => sum + scoreRule(rule, Number(metrics[rule.metricCode] ?? 0)).score, 0))
    return { dimensionId: dimension.id, dimensionName: dimension.name, fullScore, score, deductions: round(fullScore - score) }
  })
  const deductionDetails = appliedRules.map(rule => {
    const result = scoreRule(rule, Number(metrics[rule.metricCode] ?? 0))
    const dimension = dimensions.find(item => item.id === rule.dimensionId)!
    return { id: `${ent.id}-${month}-${rule.id}`, ruleId: rule.id, ruleName: rule.name, dimensionId: dimension.id, dimensionName: dimension.name, metricCode: rule.metricCode, dataSourceField: rule.dataSourceField, sourceTable: rule.sourceTable, sourceApiField: rule.sourceApiField, calcMethod: rule.calcMethod, actualValue: String(metrics[rule.metricCode] ?? '-'), maxScore: rule.maxScore, score: result.score, deducted: round(rule.maxScore - result.score), reason: result.reason }
  })
  const totalScore = round(dimensionScores.reduce((sum, item) => sum + item.score, 0))
  const level = levelOf(totalScore, ranges)
  return { id: `snap-${schemeId}-${ent.id}-${month}`, schemeId, enterpriseId: ent.id, enterpriseName: ent.name, month, generatedAt: `${month}-28 18:00`, locked: true, totalScore, levelName: level.name, levelColor: level.color, metrics, dimensionScores, deductionDetails }
}

function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) { return <span className={cn('badge', toneMap[tone])}>{children}</span> }
function Card({ title, extra, children }: { title?: ReactNode; extra?: ReactNode; children: ReactNode }) { return <div className="card">{(title || extra) && <div className="card-head"><div className="card-title">{title}</div>{extra}</div>}<div className="card-body">{children}</div></div> }
function StatCard({ title, value, subtitle, icon: Icon }: { title: string; value: ReactNode; subtitle: string; icon: React.ComponentType<{ className?: string }> }) { return <div className="card"><div className="card-body"><div className="list-card-head"><div><div className="muted">{title}</div><div className="hero-title" style={{ fontSize: 34, color: '#0f172a', marginTop: 8 }}>{value}</div><div className="small muted">{subtitle}</div></div><div className="brand-badge" style={{ background: '#f1f5f9', color: '#334155' }}><Icon className="icon-md" /></div></div></div></div> }
function Table({ columns, rows, renderRow, className }: { columns: string[]; rows: any[]; renderRow: (row: any) => ReactNode; className?: string }) { return <div className="table-wrap"><div className="table-scroll"><table className={cn('table', className)}><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map(renderRow)}</tbody></table></div></div> }
function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) { return <select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }

const RiskBadge = ({ level }: { level: Risk }) => <Badge tone={level === '高' ? 'red' : level === '中' ? 'amber' : 'emerald'}>{level}风险</Badge>
const StatusBadge = ({ value }: { value: string }) => <Badge tone={value.includes('完成') || value.includes('闭环') || value.includes('启用') ? 'emerald' : value.includes('待验收') || value.includes('待复查') || value.includes('待接单') ? 'blue' : value.includes('中') ? 'amber' : 'red'}>{value}</Badge>
const DeviceBadge = ({ status }: { status: DeviceStatus }) => <Badge tone={status === '在线' ? 'emerald' : status === '离线' ? 'slate' : 'red'}>{status}</Badge>
const PerspectiveBadge = ({ value }: { value: Perspective }) => <Badge tone={value === '企业' ? 'emerald' : value === '安全服务商' ? 'violet' : value === '保险平台' ? 'blue' : 'amber'}>{value}</Badge>
const PriorityBadge = ({ value }: { value: TaskPriority }) => <Badge tone={value === '高' ? 'red' : value === '中' ? 'amber' : 'blue'}>{value}优先</Badge>
const TaskStatusBadge = ({ value }: { value: UnifiedTaskStatus }) => <Badge tone={taskStatusTone[value]}>{value}</Badge>

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [page, setPage] = useState<PageKey>('dashboard')
  const [perspective, setPerspective] = useState<Perspective>('安全服务商')
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState(defaultEnterpriseId)
  const [selectedMonth, setSelectedMonth] = useState('2026-03')
  const [message, setMessage] = useState('')
  const [approvals] = useState(initialApprovals)
  const [schemeRows, setSchemeRows] = useState(initialSchemes)
  const [dimensionRows, setDimensionRows] = useState(initialDimensions)
  const [ruleRows, setRuleRows] = useState(initialRules)
  const [levelRows, setLevelRows] = useState(initialLevelRanges)
  const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>(() => enterprises.flatMap(ent => ['2026-01', '2026-02'].map(month => snapshotFor('scheme-v1', ent, month, initialApprovals, initialDimensions, initialRules, initialLevelRanges))))
  const [drawer, setDrawer] = useState<{ snapshotId: string; dimensionId?: string | null } | null>(null)
  const [taskListScope, setTaskListScope] = useState<TaskListScope>('all')
  const [hazardListScope, setHazardListScope] = useState<HazardListScope>('all')
  const [hazardEnterpriseId, setHazardEnterpriseId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [taskEnterpriseFilter, setTaskEnterpriseFilter] = useState('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState('all')
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | UnifiedTaskStatus>('all')
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [taskTimeFilter, setTaskTimeFilter] = useState<TaskTimeFilter>('all')
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState('all')
  const [taskQuickFilter, setTaskQuickFilter] = useState<TaskQuickFilter>('all')
  const [taskUploadedEvidence, setTaskUploadedEvidence] = useState<Record<string, UploadedTaskEvidence[]>>({})
  const [detailSnapshotMonth, setDetailSnapshotMonth] = useState<string | null>(null)
  const [selectedHazardId, setSelectedHazardId] = useState('')
  const [hazardLevelFilter, setHazardLevelFilter] = useState('all')
  const [hazardStatusFilter, setHazardStatusFilter] = useState('all')
  const [hazardReviewFilter, setHazardReviewFilter] = useState('all')
  const [hazardOverdueFilter, setHazardOverdueFilter] = useState('all')
  const [hazardTimeFilter, setHazardTimeFilter] = useState('all')
  const [hazardKeyword, setHazardKeyword] = useState('')
  const [hazardQuickFilter, setHazardQuickFilter] = useState('all')
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('')
  const [snapshotEnterpriseFilter, setSnapshotEnterpriseFilter] = useState('all')
  const [snapshotRiskFilter, setSnapshotRiskFilter] = useState('all')
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [recordEnterpriseFilter, setRecordEnterpriseFilter] = useState('all')
  const [recordTypeFilter, setRecordTypeFilter] = useState('all')
  const [recordExecutorFilter, setRecordExecutorFilter] = useState('all')
  const [recordTimeFilter, setRecordTimeFilter] = useState('all')
  const [recordStatusFilter, setRecordStatusFilter] = useState('all')
  const [recordQuickFilter, setRecordQuickFilter] = useState('all')
  const [dashboardEnterpriseFilter, setDashboardEnterpriseFilter] = useState('all')
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState('all')
  const [dashboardPriorityFilter, setDashboardPriorityFilter] = useState<'all' | TaskPriority>('all')
  const evidenceInputRef = useRef<HTMLInputElement | null>(null)
  const dashboardToday = '2026-03-21'
  const dashboardMonth = '2026-03'
  const weekStart = '2026-03-15'

  const activeScheme = schemeRows.find(item => item.status === '启用') || schemeRows[0]
  const selectedEnterprise = enterprises.find(item => item.id === selectedEnterpriseId) || enterprises[0]
  const currentSnapshot = snapshots.find(item => item.enterpriseId === selectedEnterprise.id && item.month === selectedMonth && item.schemeId === activeScheme.id) || null
  const previewSnapshot = useMemo(() => snapshotFor(activeScheme.id, selectedEnterprise, selectedMonth, approvals, dimensionRows.filter(item => item.schemeId === activeScheme.id), ruleRows.filter(item => item.schemeId === activeScheme.id), levelRows.filter(item => item.schemeId === activeScheme.id)), [selectedEnterprise, selectedMonth, approvals, dimensionRows, ruleRows, levelRows, activeScheme])
  const visibleSnapshot = currentSnapshot || previewSnapshot
  const latestMap = useMemo(() => Object.fromEntries(enterprises.map(ent => [ent.id, snapshots.filter(item => item.enterpriseId === ent.id && item.schemeId === activeScheme.id).sort((a, b) => b.month.localeCompare(a.month))[0] || snapshotFor(activeScheme.id, ent, dashboardMonth, approvals, dimensionRows.filter(item => item.schemeId === activeScheme.id), ruleRows.filter(item => item.schemeId === activeScheme.id), levelRows.filter(item => item.schemeId === activeScheme.id))])) as Record<string, ScoreSnapshot>, [activeScheme, approvals, dashboardMonth, dimensionRows, levelRows, ruleRows, snapshots])
  const drawerSnapshot = drawer ? snapshots.find(item => item.id === drawer.snapshotId) || visibleSnapshot : null
  const entOptions = enterprises.map(item => ({ value: item.id, label: item.name }))
  const monthOptions = months.map(item => ({ value: item, label: item }))
  const detailRows = drawerSnapshot?.deductionDetails.filter(item => !drawer?.dimensionId || item.dimensionId === drawer.dimensionId) || []
  const trendRows = snapshots.filter(item => item.enterpriseId === selectedEnterprise.id).sort((a, b) => a.month.localeCompare(b.month))

  const buildSnapshot = () => {
    if (currentSnapshot) {
      setMessage(`${selectedEnterprise.name} ${selectedMonth} 的快照已存在，历史不可覆盖`)
      return
    }
    const next = snapshotFor(activeScheme.id, selectedEnterprise, selectedMonth, approvals, dimensionRows.filter(item => item.schemeId === activeScheme.id), ruleRows.filter(item => item.schemeId === activeScheme.id), levelRows.filter(item => item.schemeId === activeScheme.id))
    setSnapshots(prev => [next, ...prev])
    setMessage(`已生成 ${selectedEnterprise.name} ${selectedMonth} 评分结果快照`)
  }

  const openHazardsByEnterprise = useMemo(() => Object.fromEntries(enterprises.map(ent => [ent.id, hazards.filter(item => item.enterpriseId === ent.id && item.status !== '已闭环')])) as Record<string, Hazard[]>, [])
  const latestServiceDateByEnterprise = useMemo(() => Object.fromEntries(enterprises.map(ent => { const latest = initialServiceRecords.filter(item => item.enterpriseId === ent.id).sort((a, b) => b.date.localeCompare(a.date))[0]; return [ent.id, latest?.date || '暂无服务记录'] })) as Record<string, string>, [])
  const latestProviderByEnterprise = useMemo(
    () =>
      Object.fromEntries(
        enterprises.map(ent => {
          const provider =
            initialServiceRecords.find(item => item.enterpriseId === ent.id)?.provider ||
            initialSurveyTasks.find(item => item.enterpriseId === ent.id)?.assignee ||
            '安巡安全服务机构区域组'
          return [ent.id, provider]
        }),
      ) as Record<string, string>,
    [],
  )

  const taskCenterRows = useMemo(() => {
    const surveyRows: TaskCenterItem[] = initialSurveyTasks.map((task, index) => {
      const enterprise = enterprises.find(item => item.id === task.enterpriseId) || enterprises[0]
      const relatedHazards = hazards.filter(item => item.enterpriseId === task.enterpriseId && item.status !== '已闭环')
      const overdue = task.dueDate < dashboardToday && task.stage !== '已完成' && task.stage !== '待验收'
      const hazardFound = relatedHazards.length > 0
      const status: UnifiedTaskStatus =
        overdue
          ? '已超期'
          : task.stage === '待指派' || task.stage === '待接单'
            ? '待执行'
            : task.stage === '执行中'
              ? hazardFound ? '已发现隐患' : '执行中'
              : task.stage === '待验收'
                ? '待复查'
                : hazardFound
                  ? '待整改'
                  : '已闭环'
      const progressPercent = status === '待执行' ? 12 : status === '执行中' ? 46 : status === '已发现隐患' ? 62 : status === '待整改' ? 72 : status === '待复查' ? 86 : status === '已闭环' ? 100 : 38
      return {
        taskId: task.id,
        taskCode: `RW-202603-${String(index + 1).padStart(3, '0')}`,
        taskName: `${task.type}执行`,
        enterpriseId: task.enterpriseId,
        enterpriseName: task.enterpriseName,
        taskType: task.type,
        source: task.createdBy.includes('保险平台') ? '保险平台派发' : '服务商调度',
        assignTime: surveyAssignTimeMap[task.id] || `${task.dueDate} 09:00`,
        dueTime: task.dueDate,
        assignee: task.assignee,
        status,
        priority: relatedHazards.some(item => item.deadline < dashboardToday) || enterprise.risk === '高' ? '高' : relatedHazards.length >= 2 || task.stage === '执行中' ? '中' : '低',
        taskDescription: task.focus,
        currentProgress: status === '待执行' ? '等待接单并安排现场计划。' : status === '执行中' ? '正在现场核查任务项和关键点位。' : status === '已发现隐患' ? `已识别 ${relatedHazards.length} 项隐患，待推动整改。` : status === '待整改' ? '企业正在按服务意见整改，等待补充证明。' : status === '待复查' ? '整改资料已回传，等待服务商复查。' : status === '已闭环' ? '任务已验收完成，证据已归档。' : '任务已超过计划时限，需尽快催办。',
        progressPercent,
        executionRecords: [
          { id: `${task.id}-step-1`, time: surveyAssignTimeMap[task.id] || `${task.dueDate} 09:00`, actor: task.createdBy, action: '派发任务', note: `已将${task.type}派发给${task.assignee}` },
          { id: `${task.id}-step-2`, time: `${task.dueDate} 10:30`, actor: task.assignee, action: status === '待执行' ? '等待接单' : '开始执行', note: status === '待执行' ? '已收到任务，待确认到场计划。' : `围绕“${task.focus}”展开现场核查。` },
          { id: `${task.id}-step-3`, time: `${task.dueDate} 16:10`, actor: task.assignee, action: status === '待复查' ? '提交复查申请' : status === '已闭环' ? '提交结果回传' : hazardFound ? '形成问题清单' : '更新执行记录', note: status === '待复查' ? '整改资料已齐套，等待复查。' : status === '已闭环' ? '执行结果和影像资料已回传归档。' : hazardFound ? `共记录 ${relatedHazards.length} 项待跟进问题。` : '已更新现场处理进度。' },
        ],
        evidenceFiles: [
          { id: `${task.id}-evidence-1`, title: '现场签到照片', category: '现场图片', time: surveyAssignTimeMap[task.id] || `${task.dueDate} 09:00`, description: `${enterprise.name} 现场到场照片与定位信息。` },
          { id: `${task.id}-evidence-2`, title: '检查记录单', category: '过程记录', time: `${task.dueDate} 15:30`, description: `记录${task.type}关键检查项、处理意见和责任人。` },
          { id: `${task.id}-evidence-3`, title: hazardFound ? '问题清单回传' : '执行结果回传', category: hazardFound ? '整改证明' : '过程记录', time: `${task.dueDate} 17:20`, description: hazardFound ? '包含隐患清单、责任分工和整改时限。' : '包含现场结果、结论和服务建议。' },
        ],
        hazardFound,
        hazardCount: relatedHazards.length,
        rectificationStatus: hazardFound ? (relatedHazards.some(item => item.deadline < dashboardToday) ? '存在超期整改项' : '整改推进中') : '未涉及整改',
        reviewStatus: status === '待复查' ? '待安排复查' : status === '已闭环' ? '复查已完成' : '暂未进入复查',
        relatedHazardIds: relatedHazards.map(item => item.id),
        latestAction: status === '待执行' ? '等待接单确认' : status === '已超期' ? '任务超期待催办' : hazardFound ? `已形成${relatedHazards.length}项问题` : '结果资料已回传',
      }
    })

    const serviceRows: TaskCenterItem[] = initialServiceRecords.map((record, index) => {
      const enterprise = enterprises.find(item => item.id === record.enterpriseId) || enterprises[0]
      const relatedHazards = hazards.filter(item => item.enterpriseId === record.enterpriseId && item.status !== '已闭环')
      const overdue = record.date < dashboardToday && record.status !== '已完成' && record.status !== '待验收'
      const hazardFound = relatedHazards.length > 0
      const status: UnifiedTaskStatus =
        overdue
          ? '已超期'
          : record.status === '执行中'
            ? hazardFound ? '已发现隐患' : '执行中'
            : record.status === '待验收'
              ? '待复查'
              : hazardFound
                ? '待整改'
                : '已闭环'
      const progressPercent = status === '执行中' ? 54 : status === '已发现隐患' ? 64 : status === '待整改' ? 76 : status === '待复查' ? 88 : status === '已闭环' ? 100 : 35
      return {
        taskId: record.id,
        taskCode: `RW-202603-${String(index + 101).padStart(3, '0')}`,
        taskName: `${record.serviceType}结果回传`,
        enterpriseId: record.enterpriseId,
        enterpriseName: enterprises.find(item => item.id === record.enterpriseId)?.name || '-',
        taskType: record.serviceType,
        source: '服务商执行回传',
        assignTime: serviceAssignTimeMap[record.id] || `${record.date} 09:00`,
        dueTime: record.date,
        assignee: record.provider,
        status,
        priority: relatedHazards.some(item => item.deadline < dashboardToday) || enterprise.risk === '高' ? '高' : record.status === '执行中' || record.status === '待验收' ? '中' : '低',
        taskDescription: record.result,
        currentProgress: status === '执行中' ? '现场服务正在执行，等待补充完整证据。' : status === '已发现隐患' ? `现场已发现 ${relatedHazards.length} 项隐患，正在催办整改。` : status === '待整改' ? '已提交服务意见，等待企业整改证明。' : status === '待复查' ? '整改资料已回传，等待复查确认。' : status === '已闭环' ? '服务记录、影像和结论已完成归档。' : '当前任务已超期，需要重新调度。',
        progressPercent,
        executionRecords: [
          { id: `${record.id}-step-1`, time: serviceAssignTimeMap[record.id] || `${record.date} 09:00`, actor: record.provider, action: '接收任务', note: `${record.serviceType}任务已进入执行排期。` },
          { id: `${record.id}-step-2`, time: `${record.date} 11:20`, actor: record.provider, action: '现场服务', note: record.result },
          { id: `${record.id}-step-3`, time: `${record.date} 17:10`, actor: record.provider, action: status === '待复查' ? '提交复查资料' : status === '已闭环' ? '归档闭环' : '补充执行记录', note: status === '待复查' ? '已上传整改前后对比与闭环证明。' : status === '已闭环' ? '任务验收通过，完成闭环。' : '等待下一步处理意见。' },
        ],
        evidenceFiles: [
          { id: `${record.id}-evidence-1`, title: '现场服务照片', category: '现场图片', time: `${record.date} 10:40`, description: `${enterprise.name} 现场关键点位照片。` },
          { id: `${record.id}-evidence-2`, title: '服务记录摘要', category: '过程记录', time: `${record.date} 15:50`, description: record.result },
          { id: `${record.id}-evidence-3`, title: status === '待复查' || status === '已闭环' ? '整改闭环资料' : '跟进说明', category: status === '待复查' || status === '已闭环' ? '整改证明' : '过程记录', time: `${record.date} 17:30`, description: status === '待复查' || status === '已闭环' ? '包含整改前后对比、责任人签字和复查结论。' : '包含后续安排和责任分工。' },
        ],
        hazardFound,
        hazardCount: relatedHazards.length,
        rectificationStatus: hazardFound ? (relatedHazards.some(item => item.deadline < dashboardToday) ? '存在超期整改项' : '整改推进中') : '未涉及整改',
        reviewStatus: status === '待复查' ? '待安排复查' : status === '已闭环' ? '复查已完成' : '暂未进入复查',
        relatedHazardIds: relatedHazards.map(item => item.id),
        latestAction: record.result,
      }
    })

    const hazardRows: TaskCenterItem[] = hazards.map((item, index) => {
      const enterprise = enterprises.find(ent => ent.id === item.enterpriseId) || enterprises[0]
      const assignee = latestProviderByEnterprise[item.enterpriseId] || '安巡安全服务机构区域组'
      const overdue = item.status !== '已闭环' && item.deadline < dashboardToday
      const status: UnifiedTaskStatus = item.status === '已闭环' ? '已闭环' : item.status === '待复查' ? '待复查' : overdue ? '已超期' : '待整改'
      return {
        taskId: `hz-task-${item.id}`,
        taskCode: `RW-202603-${String(index + 201).padStart(3, '0')}`,
        taskName: `${item.title}跟进`,
        enterpriseId: item.enterpriseId,
        enterpriseName: enterprise.name,
        taskType: item.status === '待复查' ? '隐患复查' : '隐患整改跟进',
        source: item.source,
        assignTime: item.foundAt,
        dueTime: item.deadline,
        assignee,
        status,
        priority: overdue || item.level === '高' ? '高' : item.level === '中' ? '中' : '低',
        taskDescription: `围绕“${item.title}”跟进整改、复查和闭环过程。`,
        currentProgress: status === '待整改' ? '等待企业补齐整改证明和处理结果。' : status === '待复查' ? '整改材料已到位，等待复查安排。' : status === '已闭环' ? '隐患已完成闭环并归档。' : '隐患整改已超期，需要立即催办。',
        progressPercent: status === '待整改' ? 58 : status === '待复查' ? 82 : status === '已闭环' ? 100 : 41,
        executionRecords: [
          { id: `${item.id}-step-1`, time: item.foundAt, actor: assignee, action: '发现隐患', note: `${item.title}，来源：${item.source}` },
          { id: `${item.id}-step-2`, time: `${item.deadline} 10:00`, actor: enterprise.leader, action: status === '已闭环' ? '提交整改结果' : '推进整改', note: status === '待复查' ? '整改材料已提交，等待复查。' : status === '已闭环' ? '整改完成并提交闭环证明。' : '仍在落实现场整改和责任分工。' },
          { id: `${item.id}-step-3`, time: `${item.deadline} 16:30`, actor: assignee, action: status === '待复查' ? '安排复查' : status === '已闭环' ? '完成复查' : overdue ? '发起催办' : '持续跟进', note: status === '待复查' ? '已进入复查排期。' : status === '已闭环' ? '复查确认通过，完成闭环。' : overdue ? '已超期，需尽快闭环。' : '保持日常跟进。' },
        ],
        evidenceFiles: [
          { id: `${item.id}-evidence-1`, title: '隐患现场照片', category: '现场图片', time: item.foundAt, description: `${enterprise.name} 问题点位现场照片。` },
          { id: `${item.id}-evidence-2`, title: '整改通知单', category: '过程记录', time: `${item.deadline} 09:30`, description: '包含整改要求、时限和责任人。' },
          { id: `${item.id}-evidence-3`, title: status === '已闭环' ? '复查通过记录' : '整改过程留存', category: status === '已闭环' ? '整改证明' : '过程记录', time: `${item.deadline} 16:00`, description: status === '已闭环' ? '复查结果、签字和闭环结论。' : '持续留存整改过程与反馈材料。' },
        ],
        hazardFound: true,
        hazardCount: 1,
        rectificationStatus: status === '已闭环' ? '整改已完成' : status === '待复查' ? '整改已完成待复查' : overdue ? '整改超期' : item.status === '整改中' ? '整改推进中' : '待启动整改',
        reviewStatus: status === '待复查' ? '待安排复查' : status === '已闭环' ? '复查已完成' : '暂未进入复查',
        relatedHazardIds: [item.id],
        latestAction: status === '已闭环' ? '闭环完成' : status === '待复查' ? '等待复查' : overdue ? '已发起催办' : '整改推进中',
      }
    })

    return [...surveyRows, ...serviceRows, ...hazardRows].sort(
      (a, b) =>
        ({ 已超期: 7, 待复查: 6, 待整改: 5, 已发现隐患: 4, 执行中: 3, 待执行: 2, 已闭环: 1 }[b.status] -
          { 已超期: 7, 待复查: 6, 待整改: 5, 已发现隐患: 4, 执行中: 3, 待执行: 2, 已闭环: 1 }[a.status]) ||
        ({ 高: 3, 中: 2, 低: 1 }[b.priority] - { 高: 3, 中: 2, 低: 1 }[a.priority]) ||
        a.dueTime.localeCompare(b.dueTime),
    )
  }, [dashboardToday, latestProviderByEnterprise])

  const serviceTaskRows = useMemo(() => [
    ...initialSurveyTasks.map(task => {
      const enterprise = enterprises.find(item => item.id === task.enterpriseId) || enterprises[0]
      const openHazardCount = openHazardsByEnterprise[task.enterpriseId]?.length || 0
      const overdueCount = (openHazardsByEnterprise[task.enterpriseId] || []).filter(item => item.deadline < dashboardToday).length
      const priority: TaskPriority = overdueCount > 0 || task.stage === '待验收' || enterprise.risk === '高' ? '高' : task.stage === '执行中' || openHazardCount >= 2 ? '中' : '低'
      return { id: task.id, enterpriseId: task.enterpriseId, enterpriseName: task.enterpriseName, taskName: `${task.type}执行`, taskType: task.type, dueDate: task.dueDate, taskStatus: task.stage, priority, assignee: task.assignee, focus: task.focus, actionOwner: task.createdBy, openHazardCount, overdueCount, source: 'survey' as const, completedAt: task.stage === '已完成' || task.stage === '待验收' ? task.dueDate : '', latestAction: task.createdBy }
    }),
    ...initialServiceRecords.map(record => {
      const enterprise = enterprises.find(item => item.id === record.enterpriseId) || enterprises[0]
      const openHazardCount = openHazardsByEnterprise[record.enterpriseId]?.length || 0
      const overdueCount = (openHazardsByEnterprise[record.enterpriseId] || []).filter(item => item.deadline < dashboardToday).length
      const priority: TaskPriority = overdueCount > 0 || enterprise.risk === '高' ? '高' : record.status === '执行中' || record.status === '待验收' ? '中' : '低'
      return { id: record.id, enterpriseId: record.enterpriseId, enterpriseName: enterprises.find(item => item.id === record.enterpriseId)?.name || '-', taskName: `${record.serviceType}结果回传`, taskType: record.serviceType, dueDate: record.date, taskStatus: record.status, priority, assignee: record.provider, focus: record.result, actionOwner: record.provider, openHazardCount, overdueCount, source: 'service' as const, completedAt: record.status === '已完成' || record.status === '待验收' ? record.date : '', latestAction: record.result }
    }),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [dashboardToday, openHazardsByEnterprise])

  const matchesTaskScope = (item: (typeof serviceTaskRows)[number], scope: 'all' | 'today' | 'weekCompleted' | 'monthly') => {
    if (scope === 'today') return item.taskStatus !== '已完成' && item.dueDate <= dashboardToday
    if (scope === 'weekCompleted') return !!item.completedAt && item.completedAt >= weekStart && item.completedAt <= dashboardToday
    if (scope === 'monthly') return item.dueDate.startsWith(dashboardMonth)
    return true
  }

  const riskRows = useMemo(
    () =>
      enterprises
        .map(ent => {
          const openRows = openHazardsByEnterprise[ent.id] || []
          const overdueCount = openRows.filter(item => item.deadline < dashboardToday).length
          const openHazardCount = openRows.length
          const riskLevel: Risk = overdueCount > 0 || openHazardCount >= 3 || ent.risk === '高' ? '高' : openHazardCount > 0 || ent.risk === '中' ? '中' : '低'
          return { enterpriseId: ent.id, enterpriseName: ent.name, riskLevel, openHazardCount, overdueCount, lastServiceDate: latestServiceDateByEnterprise[ent.id] }
        })
        .sort((a, b) => ({ 高: 3, 中: 2, 低: 1 }[b.riskLevel] - { 高: 3, 中: 2, 低: 1 }[a.riskLevel] || b.overdueCount - a.overdueCount || b.openHazardCount - a.openHazardCount))
        .slice(0, 6),
    [dashboardToday, latestServiceDateByEnterprise, openHazardsByEnterprise],
  )

  const todayTaskRows = serviceTaskRows
    .filter(item => matchesTaskScope(item, 'today'))
    .sort((a, b) => ({ 高: 3, 中: 2, 低: 1 }[b.priority] - { 高: 3, 中: 2, 低: 1 }[a.priority] || a.dueDate.localeCompare(b.dueDate)))
  const weeklyCompletedTaskRows = serviceTaskRows.filter(item => matchesTaskScope(item, 'weekCompleted'))
  const monthlyTaskRows = serviceTaskRows.filter(item => matchesTaskScope(item, 'monthly'))
  const filteredTodayTaskRows = todayTaskRows.filter(item => (dashboardEnterpriseFilter === 'all' || item.enterpriseId === dashboardEnterpriseFilter) && (dashboardStatusFilter === 'all' || item.taskStatus === dashboardStatusFilter) && (dashboardPriorityFilter === 'all' || item.priority === dashboardPriorityFilter))

  const taskCountToday = todayTaskRows.length
  const taskCompletedWeek = weeklyCompletedTaskRows.length
  const hazardPendingReview = hazards.filter(item => item.status === '待复查').length
  const overdueOpenCount = hazards.filter(item => item.status !== '已闭环' && item.deadline < dashboardToday).length
  const enterpriseCoveredCount = new Set([...initialSurveyTasks.filter(item => item.dueDate.startsWith(dashboardMonth)).map(item => item.enterpriseId), ...initialServiceRecords.filter(item => item.date.startsWith(dashboardMonth)).map(item => item.enterpriseId)]).size
  const enterpriseTotalCount = enterprises.length
  const progressWeight: Record<TaskStage, number> = { 待指派: 0.1, 待接单: 0.25, 执行中: 0.65, 待验收: 0.92, 已完成: 1 }
  const monthlyServiceCompletionRate = initialSurveyTasks.length ? round((initialSurveyTasks.reduce((sum, item) => sum + progressWeight[item.stage], 0) / initialSurveyTasks.length) * 100) : 0
  const monthlyCompletedTaskCount = monthlyTaskRows.filter(item => item.taskStatus === '待验收' || item.taskStatus === '已完成').length
  const monthlyClosedHazardCount = hazards.filter(item => item.status === '已闭环' && item.foundAt.startsWith(dashboardMonth)).length
  const monthlyNewHazardCount = hazards.filter(item => item.foundAt.startsWith(dashboardMonth)).length
  const enterpriseCoverageRate = enterpriseTotalCount ? round((enterpriseCoveredCount / enterpriseTotalCount) * 100) : 0
  const monthlySnapshotEnterpriseCount = new Set(snapshots.filter(item => item.month === dashboardMonth && item.schemeId === activeScheme.id).map(item => item.enterpriseId)).size

  const taskStatusOptions = [{ value: 'all', label: '全部状态' }, ...Array.from(new Set(todayTaskRows.map(item => item.taskStatus))).map(item => ({ value: item, label: item }))]
  const priorityOptions = [{ value: 'all', label: '全部优先级' }, { value: '高', label: '高优先' }, { value: '中', label: '中优先' }, { value: '低', label: '低优先' }]
  const enterpriseFilterOptions = [{ value: 'all', label: '全部企业' }, ...entOptions]
  const taskTypeOptions = [{ value: 'all', label: '全部任务类型' }, ...Array.from(new Set(taskCenterRows.map(item => item.taskType))).map(item => ({ value: item, label: item }))]
  const taskStatusFilterOptions = [{ value: 'all', label: '全部任务状态' }, ...taskStatusOrder.map(item => ({ value: item, label: item }))]
  const taskAssigneeOptions = [{ value: 'all', label: '全部执行人' }, ...Array.from(new Set(taskCenterRows.map(item => item.assignee))).map(item => ({ value: item, label: item }))]
  const taskTimeOptions = (Object.keys(taskTimeFilterLabels) as TaskTimeFilter[]).map(item => ({ value: item, label: taskTimeFilterLabels[item] }))
  const taskScopedRows = taskCenterRows.filter(item => {
    if (taskListScope === 'today') return item.status !== '已闭环' && item.dueTime <= dashboardToday
    if (taskListScope === 'weekCompleted') return item.status === '已闭环' && item.dueTime >= weekStart && item.dueTime <= dashboardToday
    if (taskListScope === 'monthly') return item.dueTime.startsWith(dashboardMonth) || item.assignTime.startsWith(dashboardMonth)
    return true
  })
  const taskRowsForPage = taskScopedRows.filter(item => {
    const matchesEnterprise = taskEnterpriseFilter === 'all' || item.enterpriseId === taskEnterpriseFilter
    const matchesType = taskTypeFilter === 'all' || item.taskType === taskTypeFilter
    const matchesStatus = taskStatusFilter === 'all' || item.status === taskStatusFilter
    const matchesPriority = taskPriorityFilter === 'all' || item.priority === taskPriorityFilter
    const matchesAssignee = taskAssigneeFilter === 'all' || item.assignee === taskAssigneeFilter
    const matchesTime =
      taskTimeFilter === 'all' ||
      (taskTimeFilter === 'last7days' && item.assignTime.slice(0, 10) >= weekStart) ||
      (taskTimeFilter === 'thisMonth' && (item.assignTime.startsWith(dashboardMonth) || item.dueTime.startsWith(dashboardMonth))) ||
      (taskTimeFilter === 'next7days' && item.dueTime >= dashboardToday && item.dueTime <= '2026-03-28')
    const matchesQuick = taskQuickFilter === 'all' || (taskQuickFilter === 'overdue' ? item.status === '已超期' : item.status === '待复查')
    return matchesEnterprise && matchesType && matchesStatus && matchesPriority && matchesAssignee && matchesTime && matchesQuick
  })
  const selectedTask = taskCenterRows.find(item => item.taskId === selectedTaskId) || null
  const visibleTaskDetail = page === 'tasks' && !!selectedTaskId && !!selectedTask
  const taskStatusSummary = taskStatusOrder.map(status => ({ status, count: taskScopedRows.filter(item => item.status === status).length }))
  const hazardRowsForPage = hazards
    .filter(item => (hazardListScope === 'pendingReview' ? item.status === '待复查' : hazardListScope === 'overdueOpen' ? item.status !== '已闭环' && item.deadline < dashboardToday : true))
    .filter(item => !hazardEnterpriseId || item.enterpriseId === hazardEnterpriseId)
    .map(item => ({ ...item, enterpriseName: enterprises.find(ent => ent.id === item.enterpriseId)?.name || '-' }))
  const taskScopeDescription = taskListScope === 'today' ? '当前展示今天需要优先调度和执行的任务。' : taskListScope === 'weekCompleted' ? '当前展示本周已闭环任务，便于复盘交付结果。' : taskListScope === 'monthly' ? '当前展示本月任务推进情况，便于统筹交付。' : '当前展示全部任务，可按企业、状态、执行人等条件调度。'
  const activeHazardEnterpriseName = hazardEnterpriseId ? enterprises.find(item => item.id === hazardEnterpriseId)?.name || '' : ''
  const selectedTaskUploads = selectedTask ? taskUploadedEvidence[selectedTask.taskId] || [] : []
  const hazardLevelOptions = [{ value: 'all', label: '全部等级' }, ...(['高', '中', '低'] as Risk[]).map(item => ({ value: item, label: `${item}风险` }))]
  const hazardStatusOptions = [{ value: 'all', label: '全部整改状态' }, ...(['待整改', '整改中', '待复查', '已闭环'] as HazardStatus[]).map(item => ({ value: item, label: item }))]
  const hazardReviewOptions = [
    { value: 'all', label: '全部复查状态' },
    { value: '待复查', label: '待复查' },
    { value: '已复查', label: '已复查' },
    { value: '未进入复查', label: '未进入复查' },
  ]
  const hazardOverdueOptions = [
    { value: 'all', label: '全部时效' },
    { value: 'yes', label: '已超期' },
    { value: 'no', label: '未超期' },
  ]
  const hazardTimeOptions = [
    { value: 'all', label: '全部时间' },
    { value: 'last7days', label: '近 7 天' },
    { value: 'thisMonth', label: '本月' },
    { value: 'closedThisMonth', label: '本月闭环' },
  ]
  const snapshotRiskOptions = [{ value: 'all', label: '全部风险等级' }, ...(['高', '中', '低'] as Risk[]).map(item => ({ value: item, label: `${item}风险` }))]
  const recordTypeOptions = [{ value: 'all', label: '全部服务类型' }, ...Array.from(new Set(taskCenterRows.map(item => item.taskType))).map(item => ({ value: item, label: item }))]
  const recordExecutorOptions = [{ value: 'all', label: '全部执行人' }, ...Array.from(new Set(taskCenterRows.map(item => item.assignee))).map(item => ({ value: item, label: item }))]
  const recordTimeOptions = [
    { value: 'all', label: '全部时间' },
    { value: 'thisMonth', label: '本月' },
    { value: 'last7days', label: '近 7 天' },
    { value: 'last30days', label: '近 30 天' },
  ]
  const recordStatusOptions = [
    { value: 'all', label: '全部状态' },
    { value: '证据完整', label: '证据完整' },
    { value: '待补证据', label: '待补证据' },
    { value: '异常记录', label: '异常记录' },
  ]
  const hazardRowsDetailed = useMemo(() => {
    return hazards
      .map((item, index) => {
        const enterprise = enterprises.find(ent => ent.id === item.enterpriseId) || enterprises[0]
        const sourceTask = taskCenterRows.find(task => task.relatedHazardIds.includes(item.id) || task.enterpriseId === item.enterpriseId)
        const rectificationStatus =
          item.status === '已闭环'
            ? '整改已完成'
            : item.status === '待复查'
              ? '整改已提交待复查'
              : item.status === '整改中'
                ? '整改推进中'
                : '待启动整改'
        const reviewStatus = item.status === '待复查' ? '待复查' : item.status === '已闭环' ? '已复查' : '未进入复查'
        const isOverdue = item.status !== '已闭环' && item.deadline < dashboardToday
        const evidenceFiles = [
          { id: `${item.id}-evi-1`, title: '隐患现场照片', category: '现场图片' as const, time: item.foundAt, description: `${item.title} 现场拍摄留痕。` },
          { id: `${item.id}-evi-2`, title: '整改通知单', category: '过程记录' as const, time: `${item.deadline} 09:00`, description: `已向${enterprise.name}下达整改要求和责任分工。` },
          { id: `${item.id}-evi-3`, title: item.status === '已闭环' ? '闭环证明' : '整改过程记录', category: '整改证明' as const, time: `${item.deadline} 17:00`, description: item.status === '已闭环' ? '已完成复查签认与闭环归档。' : '当前整改过程已持续跟进。' },
        ]
        const rectificationRecords = [
          { id: `${item.id}-rect-1`, time: `${item.foundAt.slice(0, 10)} 18:00`, actor: enterprise.leader, action: '确认整改责任', note: `由${enterprise.leader}牵头推进${item.title}整改。` },
          { id: `${item.id}-rect-2`, time: `${item.deadline} 10:30`, actor: '安全员', action: item.status === '待整改' ? '制定整改计划' : '提交整改证明', note: item.status === '待整改' ? '已明确整改措施、物料和时限。' : '已上传整改前后对比照片和说明。' },
        ]
        const reviewRecords =
          item.status === '待复查' || item.status === '已闭环'
            ? [
                { id: `${item.id}-review-1`, time: `${item.deadline} 16:00`, actor: latestProviderByEnterprise[item.enterpriseId], action: '安排复查', note: '已安排复查人员和到场时间。' },
                { id: `${item.id}-review-2`, time: item.status === '已闭环' ? `${item.deadline} 17:30` : `${item.deadline} 17:00`, actor: latestProviderByEnterprise[item.enterpriseId], action: item.status === '已闭环' ? '复查通过' : '待复查确认', note: item.status === '已闭环' ? '现场复查通过，形成闭环结论。' : '复查资料已齐套，等待最终确认。' },
              ]
            : []
        const timeline = [
          { id: `${item.id}-tl-1`, title: '任务发现', time: item.foundAt, note: `来源：${item.source}` , tone: 'blue' as Tone, evidences: [evidenceFiles[0]]},
          { id: `${item.id}-tl-2`, title: '隐患上报', time: `${item.foundAt.slice(0, 10)} 17:20`, note: '已形成问题清单并明确责任人。', tone: 'amber' as Tone, evidences: [evidenceFiles[1]]},
          { id: `${item.id}-tl-3`, title: '整改提交', time: `${item.deadline} 10:30`, note: rectificationStatus, tone: item.status === '待整改' ? 'slate' as Tone : 'blue' as Tone, evidences: [evidenceFiles[2]]},
          { id: `${item.id}-tl-4`, title: '复查确认', time: `${item.deadline} 16:30`, note: reviewStatus, tone: reviewStatus === '已复查' ? 'emerald' as Tone : reviewStatus === '待复查' ? 'violet' as Tone : 'slate' as Tone, evidences: reviewRecords.length ? [evidenceFiles[2]] : []},
          { id: `${item.id}-tl-5`, title: '闭环归档', time: item.status === '已闭环' ? `${item.deadline} 18:00` : '--', note: item.status === '已闭环' ? '闭环完成并归档。' : '等待闭环确认。', tone: item.status === '已闭环' ? 'emerald' as Tone : 'slate' as Tone, evidences: item.status === '已闭环' ? [evidenceFiles[2]] : []},
        ]
        return {
          hazardId: item.id,
          hazardCode: `YH-202603-${String(index + 1).padStart(3, '0')}`,
          enterpriseId: item.enterpriseId,
          enterpriseName: enterprise.name,
          hazardName: item.title,
          hazardDescription: `${item.title}，需在规定期限内完成整改并留存复查证据。`,
          hazardLevel: item.level,
          foundAt: item.foundAt,
          sourceTaskId: sourceTask?.taskId || '',
          sourceTaskName: sourceTask?.taskName || item.source,
          responsiblePerson: item.level === '高' ? enterprise.leader : item.level === '中' ? '安全主管' : '车间主任',
          rectificationDeadline: item.deadline,
          status: item.status,
          isOverdue,
          evidenceFiles,
          rectificationRecords,
          reviewRecords,
          reviewStatus,
          rectificationStatus,
          closedAt: item.status === '已闭环' ? `${item.deadline} 18:00` : '',
          timeline,
          source: item.source,
        }
      })
      .sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue) || ({ 高: 3, 中: 2, 低: 1 }[b.hazardLevel] - { 高: 3, 中: 2, 低: 1 }[a.hazardLevel]) || a.rectificationDeadline.localeCompare(b.rectificationDeadline))
  }, [dashboardToday, taskCenterRows, latestProviderByEnterprise])
  const hazardRowsForPageDetailed = useMemo(() => {
    return hazardRowsDetailed.filter(item => {
      const matchesScope =
        hazardListScope === 'pendingReview'
          ? item.status === '待复查'
          : hazardListScope === 'overdueOpen'
            ? item.status !== '已闭环' && item.isOverdue
            : true
      const matchesEnterprise = !hazardEnterpriseId || item.enterpriseId === hazardEnterpriseId
      const matchesLevel = hazardLevelFilter === 'all' || item.hazardLevel === hazardLevelFilter
      const matchesStatus = hazardStatusFilter === 'all' || item.status === hazardStatusFilter
      const matchesReview = hazardReviewFilter === 'all' || item.reviewStatus === hazardReviewFilter
      const matchesOverdue = hazardOverdueFilter === 'all' || (hazardOverdueFilter === 'yes' ? item.isOverdue : !item.isOverdue)
      const matchesTime =
        hazardTimeFilter === 'all' ||
        (hazardTimeFilter === 'last7days' && item.foundAt.slice(0, 10) >= weekStart) ||
        (hazardTimeFilter === 'thisMonth' && item.foundAt.startsWith(dashboardMonth)) ||
        (hazardTimeFilter === 'closedThisMonth' && item.closedAt.startsWith(dashboardMonth))
      const keyword = hazardKeyword.trim()
      const matchesKeyword = !keyword || item.hazardCode.includes(keyword) || item.hazardName.includes(keyword) || item.enterpriseName.includes(keyword)
      const matchesQuick =
        hazardQuickFilter === 'all' ||
        (hazardQuickFilter === 'overdue' ? item.isOverdue : hazardQuickFilter === 'pendingReview' ? item.status === '待复查' : item.hazardLevel === '高')
      return matchesScope && matchesEnterprise && matchesLevel && matchesStatus && matchesReview && matchesOverdue && matchesTime && matchesKeyword && matchesQuick
    })
  }, [dashboardMonth, hazardEnterpriseId, hazardKeyword, hazardLevelFilter, hazardListScope, hazardOverdueFilter, hazardQuickFilter, hazardReviewFilter, hazardRowsDetailed, hazardStatusFilter, hazardTimeFilter, weekStart])
  const selectedHazard = hazardRowsDetailed.find(item => item.hazardId === selectedHazardId) || null
  const visibleHazardDetail = page === 'hazards' && !!selectedHazard
  const hazardSummaryCards = [
    { key: 'open', label: '未闭环隐患数', value: hazardRowsDetailed.filter(item => item.status !== '已闭环').length, tone: 'amber' as Tone },
    { key: 'rect', label: '待整改数', value: hazardRowsDetailed.filter(item => item.status === '待整改' || item.status === '整改中').length, tone: 'blue' as Tone },
    { key: 'review', label: '待复查数', value: hazardRowsDetailed.filter(item => item.status === '待复查').length, tone: 'violet' as Tone },
    { key: 'overdue', label: '超期未闭环数', value: hazardRowsDetailed.filter(item => item.status !== '已闭环' && item.isOverdue).length, tone: 'red' as Tone },
    { key: 'closed', label: '本月已闭环数', value: hazardRowsDetailed.filter(item => item.closedAt.startsWith(dashboardMonth)).length, tone: 'emerald' as Tone },
  ]
  const snapshotRows = useMemo(() => {
    return enterprises.map(ent => {
      const current =
        snapshots.find(item => item.enterpriseId === ent.id && item.month === selectedMonth && item.schemeId === activeScheme.id) ||
        snapshotFor(activeScheme.id, ent, selectedMonth, approvals, dimensionRows.filter(item => item.schemeId === activeScheme.id), ruleRows.filter(item => item.schemeId === activeScheme.id), levelRows.filter(item => item.schemeId === activeScheme.id))
      const currentIndex = months.indexOf(selectedMonth)
      const previousMonth = currentIndex > 0 ? months[currentIndex - 1] : months[Math.max(0, months.length - 2)]
      const previous =
        snapshots.find(item => item.enterpriseId === ent.id && item.month === previousMonth && item.schemeId === activeScheme.id) ||
        snapshotFor(activeScheme.id, ent, previousMonth, approvals, dimensionRows.filter(item => item.schemeId === activeScheme.id), ruleRows.filter(item => item.schemeId === activeScheme.id), levelRows.filter(item => item.schemeId === activeScheme.id))
      const pendingHazardCount = Number(current.metrics.pendingHazardCount || 0)
      const abnormalDeviceCount = Number(current.metrics.abnormalDeviceCount || 0)
      const closureRate = clamp(100 - pendingHazardCount * 12 - abnormalDeviceCount * 6, 55, 100)
      const riskLevel: Risk = closureRate < 72 || pendingHazardCount >= 4 ? '高' : closureRate < 88 || pendingHazardCount >= 2 ? '中' : '低'
      const trendValue = current.totalScore - previous.totalScore
      const trendStatus = trendValue >= 3 ? '持续向好' : trendValue <= -3 ? '下滑预警' : '基本持平'
      const serviceSummary = `${taskCenterRows.filter(item => item.enterpriseId === ent.id && (item.assignTime.startsWith(selectedMonth) || item.dueTime.startsWith(selectedMonth))).length} 次服务动作`
      const reviewSuggestion = riskLevel === '高' ? '建议重点复核' : riskLevel === '中' ? '建议持续跟踪' : '建议保持当前节奏'
      const snapshotRemark = riskLevel === '高' ? '高风险与超期项需要持续压降。' : riskLevel === '中' ? '整体可控，但仍需关注整改时效。' : '本月表现稳定，可作为续保与服务佐证。'
      return {
        snapshotId: current.id,
        enterpriseId: ent.id,
        enterpriseName: ent.name,
        snapshotMonth: selectedMonth,
        monthlyScore: current.totalScore,
        riskLevel,
        inspectionCoverageRate: Number(current.metrics.inspectionCoverage || 0),
        closureRate,
        overdueCount: hazardRowsDetailed.filter(item => item.enterpriseId === ent.id && item.isOverdue).length,
        trendStatus,
        avgScore: current.totalScore,
        highRiskEnterpriseCount: riskLevel === '高' ? 1 : 0,
        scoreTrend: trendValue,
        riskTrend: previous.levelName === current.levelName ? '等级稳定' : `${previous.levelName} -> ${current.levelName}`,
        serviceSummary,
        reviewSuggestion,
        snapshotRemark,
        serviceCount: taskCenterRows.filter(item => item.enterpriseId === ent.id && (item.assignTime.startsWith(selectedMonth) || item.dueTime.startsWith(selectedMonth))).length,
        previousScore: previous.totalScore,
        previousClosureRate: clamp(100 - Number(previous.metrics.pendingHazardCount || 0) * 12 - Number(previous.metrics.abnormalDeviceCount || 0) * 6, 55, 100),
        levelName: current.levelName,
        levelColor: current.levelColor,
        detail: current,
        mainRisks: current.deductionDetails.filter(item => item.deducted > 0).slice(0, 4),
      }
    })
  }, [activeScheme.id, approvals, dashboardMonth, dimensionRows, hazardRowsDetailed, levelRows, months, ruleRows, selectedMonth, snapshots, taskCenterRows])
  const filteredSnapshotRows = snapshotRows.filter(item => (snapshotEnterpriseFilter === 'all' || item.enterpriseId === snapshotEnterpriseFilter) && (snapshotRiskFilter === 'all' || item.riskLevel === snapshotRiskFilter))
  const selectedSnapshot = filteredSnapshotRows.find(item => item.snapshotId === selectedSnapshotId) || snapshotRows.find(item => item.snapshotId === selectedSnapshotId) || null
  const visibleSnapshotDetail = page === 'scoreDetail' && !!selectedSnapshot
  const snapshotOverview = {
    enterpriseCount: filteredSnapshotRows.length,
    highRiskCount: filteredSnapshotRows.filter(item => item.riskLevel === '高').length,
    avgScore: filteredSnapshotRows.length ? round(filteredSnapshotRows.reduce((sum, item) => sum + item.monthlyScore, 0) / filteredSnapshotRows.length) : 0,
    closureRate: filteredSnapshotRows.length ? round(filteredSnapshotRows.reduce((sum, item) => sum + item.closureRate, 0) / filteredSnapshotRows.length) : 0,
    monthOnMonth: filteredSnapshotRows.length ? round(filteredSnapshotRows.reduce((sum, item) => sum + item.scoreTrend, 0) / filteredSnapshotRows.length) : 0,
  }
  const snapshotTrendMonths = months.slice(-4)
  const snapshotTrendRows = snapshotTrendMonths.map(month => {
    const monthRows = enterprises.map(ent => snapshotFor(activeScheme.id, ent, month, approvals, dimensionRows.filter(item => item.schemeId === activeScheme.id), ruleRows.filter(item => item.schemeId === activeScheme.id), levelRows.filter(item => item.schemeId === activeScheme.id)))
    const avgScore = round(monthRows.reduce((sum, item) => sum + item.totalScore, 0) / monthRows.length)
    const closureRate = round(monthRows.reduce((sum, item) => sum + clamp(100 - Number(item.metrics.pendingHazardCount || 0) * 12 - Number(item.metrics.abnormalDeviceCount || 0) * 6, 55, 100), 0) / monthRows.length)
    const highRiskCount = monthRows.filter(item => item.totalScore < 70).length
    return {
      month,
      avgScore,
      closureRate,
      highRiskCount,
      note: highRiskCount >= 3 ? '重点关注高风险企业和超期整改。' : closureRate >= 85 ? '本月闭环表现稳定。' : '闭环压力仍需跟踪。',
    }
  })
  const serviceLedgerRows = useMemo(() => {
    return taskCenterRows.map((item, index) => {
      const uploaded = taskUploadedEvidence[item.taskId] || []
      const evidenceFiles = [
        ...item.evidenceFiles.map(file => ({ id: file.id, title: file.title, time: file.time, previewUrl: '', description: file.description })),
        ...uploaded,
      ]
      const evidenceCount = evidenceFiles.length
      const hasMissingEvidence = evidenceCount < 4
      const abnormal = item.status === '已超期' || item.hazardCount > 0
      const relatedHazardId = item.relatedHazardIds[0] || ''
      const relatedSnapshotId = snapshotRows.find(row => row.enterpriseId === item.enterpriseId)?.snapshotId || ''
      const recordStatus = abnormal ? '异常记录' : hasMissingEvidence ? '待补证据' : '证据完整'
      const resultSummary = item.currentProgress
      return {
        recordId: `JL-202603-${String(index + 1).padStart(3, '0')}`,
        enterpriseId: item.enterpriseId,
        enterpriseName: item.enterpriseName,
        serviceType: item.taskType,
        sourceTaskId: item.taskId,
        sourceTaskName: item.taskName,
        executor: item.assignee,
        executedAt: item.assignTime,
        resultSummary,
        evidenceCount,
        recordStatus,
        evidenceFiles,
        relatedHazardId,
        relatedSnapshotId,
        remark: `${item.latestAction}，已形成服务留痕。`,
        evidenceCompletenessRate: clamp(Math.round((evidenceCount / 4) * 100), 0, 100),
        missingEvidenceCount: Math.max(0, 4 - evidenceCount),
      }
    })
  }, [snapshotRows, taskCenterRows, taskUploadedEvidence])
  const filteredServiceLedgerRows = serviceLedgerRows.filter(item => {
    const matchesEnterprise = recordEnterpriseFilter === 'all' || item.enterpriseId === recordEnterpriseFilter
    const matchesType = recordTypeFilter === 'all' || item.serviceType === recordTypeFilter
    const matchesExecutor = recordExecutorFilter === 'all' || item.executor === recordExecutorFilter
    const matchesTime =
      recordTimeFilter === 'all' ||
      (recordTimeFilter === 'thisMonth' && item.executedAt.startsWith(dashboardMonth)) ||
      (recordTimeFilter === 'last7days' && item.executedAt.slice(0, 10) >= weekStart) ||
      (recordTimeFilter === 'last30days' && item.executedAt.slice(0, 7) >= '2026-02')
    const matchesStatus = recordStatusFilter === 'all' || item.recordStatus === recordStatusFilter
    const matchesQuick =
      recordQuickFilter === 'all' ||
      (recordQuickFilter === 'missingEvidence' ? item.missingEvidenceCount > 0 : recordQuickFilter === 'thisMonth' ? item.executedAt.startsWith(dashboardMonth) : item.enterpriseId === selectedEnterpriseId)
    return matchesEnterprise && matchesType && matchesExecutor && matchesTime && matchesStatus && matchesQuick
  })
  const selectedRecord = filteredServiceLedgerRows.find(item => item.recordId === selectedRecordId) || serviceLedgerRows.find(item => item.recordId === selectedRecordId) || null
  const visibleRecordDetail = page === 'devices' && !!selectedRecord
  const serviceLedgerOverview = {
    monthlyServiceCount: serviceLedgerRows.filter(item => item.executedAt.startsWith(dashboardMonth)).length,
    generatedCount: serviceLedgerRows.length,
    evidenceRate: serviceLedgerRows.length ? round(serviceLedgerRows.reduce((sum, item) => sum + item.evidenceCompletenessRate, 0) / serviceLedgerRows.length) : 0,
    abnormalCount: serviceLedgerRows.filter(item => item.recordStatus === '异常记录').length,
    coverageRate: round((new Set(serviceLedgerRows.filter(item => item.executedAt.startsWith(dashboardMonth)).map(item => item.enterpriseId)).size / enterprises.length) * 100),
  }
  const serviceTypeDistribution = recordTypeOptions.filter(item => item.value !== 'all').map(item => ({ type: item.label, count: serviceLedgerRows.filter(row => row.serviceType === item.value).length }))
  const deliveryLedger = {
    deliverableCount: serviceLedgerRows.filter(item => item.recordStatus === '证据完整').length,
    missingEvidenceCount: serviceLedgerRows.filter(item => item.missingEvidenceCount > 0).length,
    pendingCompletionCount: serviceLedgerRows.filter(item => item.recordStatus !== '证据完整').length,
  }
  const selectedEnterpriseInsuranceStatus = insuranceStatusMap[selectedEnterprise.id] || '在保'
  const portraitOpenHazards = hazards.filter(item => item.enterpriseId === selectedEnterprise.id && item.status !== '已闭环')
  const portraitHazardRows = portraitOpenHazards.map(item => ({ ...item, owner: item.level === '高' ? '企业负责人' : item.level === '中' ? '安全主管' : '车间主任', overdue: item.deadline < dashboardToday }))
  const portraitOverdueHazardCount = portraitHazardRows.filter(item => item.overdue).length
  const portraitMonthlyScore = visibleSnapshot.totalScore
  const portraitInspectionCoverageRate = opsMap[selectedEnterprise.id]?.coverage || 0
  const portraitMonthlyServiceCount = taskCenterRows.filter(item => item.enterpriseId === selectedEnterprise.id && (item.assignTime.startsWith(dashboardMonth) || item.dueTime.startsWith(dashboardMonth))).length
  const portraitTasks = taskCenterRows.filter(item => item.enterpriseId === selectedEnterprise.id).sort((a, b) => b.assignTime.localeCompare(a.assignTime))
  const portraitServiceRecords = useMemo<PortraitServiceRecord[]>(() => {
    const baseTasks = portraitTasks
    if (!baseTasks.length) return []
    const pickTask = (index: number) => baseTasks[Math.min(index, baseTasks.length - 1)]
    return [
      { id: `${selectedEnterprise.id}-service-1`, serviceType: '巡检', time: `${dashboardMonth}-05 10:00`, executor: latestProviderByEnterprise[selectedEnterprise.id], summary: '完成本月现场巡检和关键部位抽查，已更新企业安全画像。', status: '已完成', relatedTaskId: pickTask(0).taskId },
      { id: `${selectedEnterprise.id}-service-2`, serviceType: '培训', time: `${dashboardMonth}-08 15:30`, executor: '安巡安全服务机构培训组', summary: '围绕近期高频隐患开展班组长培训，强化整改责任落实。', status: '已完成', relatedTaskId: pickTask(1).taskId },
      { id: `${selectedEnterprise.id}-service-3`, serviceType: '点检', time: `${dashboardMonth}-12 09:20`, executor: latestProviderByEnterprise[selectedEnterprise.id], summary: '对消防、配电和关键设备进行点检复核，补齐检查记录。', status: '执行完成', relatedTaskId: pickTask(2).taskId },
      { id: `${selectedEnterprise.id}-service-4`, serviceType: '隐患复查', time: `${dashboardMonth}-16 16:10`, executor: latestProviderByEnterprise[selectedEnterprise.id], summary: portraitOverdueHazardCount > 0 ? '针对超期隐患发起复查催办，推动企业补齐整改证明。' : '针对整改完成项进行复查确认，持续跟进闭环。', status: portraitHazardRows.some(item => item.status === '待复查') ? '待复查' : '持续跟进', relatedTaskId: pickTask(0).taskId },
      { id: `${selectedEnterprise.id}-service-5`, serviceType: '其他任务记录', time: `${dashboardMonth}-19 14:40`, executor: latestProviderByEnterprise[selectedEnterprise.id], summary: `围绕${selectedEnterprise.name}的重点风险项更新本月服务结论和后续安排。`, status: '已记录', relatedTaskId: pickTask(3).taskId },
    ]
  }, [dashboardMonth, latestProviderByEnterprise, portraitHazardRows, portraitOverdueHazardCount, portraitTasks, selectedEnterprise.id, selectedEnterprise.name])
  const portraitTrendRows = useMemo<PortraitMonthlySnapshot[]>(() => {
    const relevantMonths = months.slice(-4)
    return relevantMonths.map(month => {
      const snapshot =
        snapshots.find(item => item.enterpriseId === selectedEnterprise.id && item.month === month && item.schemeId === activeScheme.id) ||
        snapshotFor(activeScheme.id, selectedEnterprise, month, approvals, dimensionRows.filter(item => item.schemeId === activeScheme.id), ruleRows.filter(item => item.schemeId === activeScheme.id), levelRows.filter(item => item.schemeId === activeScheme.id))
      const pendingHazardCount = Number(snapshot.metrics.pendingHazardCount || 0)
      const closedRate = clamp(100 - pendingHazardCount * 12 - Number(snapshot.metrics.abnormalDeviceCount || 0) * 6, 58, 100)
      const riskLevel: Risk = closedRate < 72 || pendingHazardCount >= 4 ? '高' : closedRate < 88 || pendingHazardCount >= 2 ? '中' : '低'
      const note = riskLevel === '高' ? '本月重点盯防超期整改和高风险作业闭环。' : riskLevel === '中' ? '风险整体可控，仍需压实整改时效。' : '整体运行平稳，建议保持现有服务节奏。'
      return {
        month,
        score: snapshot.totalScore,
        levelName: snapshot.levelName,
        levelColor: snapshot.levelColor,
        riskLevel,
        closedRate,
        note,
        serviceSummary: `${Math.max(1, portraitServiceRecords.filter(item => item.time.startsWith(month)).length)} 次服务动作`,
        hazardChange: pendingHazardCount > 0 ? `仍有 ${pendingHazardCount} 项待跟进隐患` : '重点隐患已基本闭环',
        keyActions: portraitServiceRecords.filter(item => item.time.startsWith(month)).slice(0, 3).map(item => `${item.serviceType}：${item.summary}`),
        openHazardCount: pendingHazardCount,
        overdueHazardCount: clamp(pendingHazardCount - 1, 0, pendingHazardCount),
      }
    })
  }, [activeScheme.id, approvals, dimensionRows, levelRows, months, portraitServiceRecords, ruleRows, selectedEnterprise, snapshots])
  const activePortraitSnapshot = portraitTrendRows.find(item => item.month === (detailSnapshotMonth || selectedMonth)) || portraitTrendRows[portraitTrendRows.length - 1]
  const routeState = useMemo(() => parseAppLocation(location.pathname, location.search) as AppRouteState, [location.pathname, location.search])
  const currentHref = `${location.pathname}${location.search}`

  const applyRouteState = (route: AppRouteState) => {
    setPage(route.page)
    setSelectedEnterpriseId(route.enterpriseId || defaultEnterpriseId)
    setSelectedMonth(route.selectedMonth || dashboardMonth)
    setDetailSnapshotMonth(route.detailSnapshotMonth || null)
    setTaskListScope(route.taskListScope || 'all')
    setHazardListScope(route.hazardListScope || 'all')
    setHazardEnterpriseId(route.hazardEnterpriseId || '')
    setSelectedTaskId(route.taskId || '')
    setTaskEnterpriseFilter(route.taskEnterpriseFilter || 'all')
    setTaskTypeFilter(route.taskTypeFilter || 'all')
    setTaskStatusFilter(route.taskStatusFilter || 'all')
    setTaskPriorityFilter(route.taskPriorityFilter || 'all')
    setTaskTimeFilter(route.taskTimeFilter || 'all')
    setTaskAssigneeFilter(route.taskAssigneeFilter || 'all')
    setTaskQuickFilter(route.taskQuickFilter || 'all')
    setSelectedHazardId(route.selectedHazardId || '')
    setHazardLevelFilter(route.hazardLevelFilter || 'all')
    setHazardStatusFilter(route.hazardStatusFilter || 'all')
    setHazardReviewFilter(route.hazardReviewFilter || 'all')
    setHazardOverdueFilter(route.hazardOverdueFilter || 'all')
    setHazardTimeFilter(route.hazardTimeFilter || 'all')
    setHazardKeyword(route.hazardKeyword || '')
    setHazardQuickFilter(route.hazardQuickFilter || 'all')
    setSelectedSnapshotId(route.selectedSnapshotId || '')
    setSnapshotEnterpriseFilter(route.snapshotEnterpriseFilter || 'all')
    setSnapshotRiskFilter(route.snapshotRiskFilter || 'all')
    setSelectedRecordId(route.selectedRecordId || '')
    setRecordEnterpriseFilter(route.recordEnterpriseFilter || 'all')
    setRecordTypeFilter(route.recordTypeFilter || 'all')
    setRecordExecutorFilter(route.recordExecutorFilter || 'all')
    setRecordTimeFilter(route.recordTimeFilter || 'all')
    setRecordStatusFilter(route.recordStatusFilter || 'all')
    setRecordQuickFilter(route.recordQuickFilter || 'all')
  }

  const navigateToRoute = (route: AppRouteState, replace = false) => {
    const href = buildAppHref(route)
    if (href === currentHref) return
    navigate(href, { replace })
  }

  useEffect(() => {
    const canonicalHref = buildAppHref(routeState)
    if (canonicalHref !== currentHref) {
      navigate(canonicalHref, { replace: true })
      return
    }
    applyRouteState(routeState)
  }, [currentHref, navigate, routeState])

  useEffect(() => {
    if (page !== 'tasks') return
    const nextRoute: AppRouteState = {
      page: 'tasks',
      taskId: selectedTaskId || undefined,
      taskListScope,
      taskEnterpriseFilter,
      taskTypeFilter,
      taskStatusFilter,
      taskPriorityFilter,
      taskTimeFilter,
      taskAssigneeFilter,
      taskQuickFilter,
    }
    navigateToRoute(nextRoute, true)
  }, [page, selectedTaskId, taskListScope, taskEnterpriseFilter, taskTypeFilter, taskStatusFilter, taskPriorityFilter, taskTimeFilter, taskAssigneeFilter, taskQuickFilter])

  useEffect(() => {
    if (page !== 'detail') return
    const routeState: AppRouteState = {
      page: 'detail',
      enterpriseId: selectedEnterpriseId,
      selectedMonth,
      detailSnapshotMonth: detailSnapshotMonth || undefined,
    }
    navigateToRoute(routeState, true)
  }, [page, selectedEnterpriseId, selectedMonth, detailSnapshotMonth])

  useEffect(() => {
    if (page !== 'hazards') return
    navigateToRoute(
      {
        page: 'hazards',
        enterpriseId: selectedEnterpriseId || undefined,
        hazardEnterpriseId: hazardEnterpriseId || undefined,
        hazardListScope,
        selectedHazardId: selectedHazardId || undefined,
        hazardLevelFilter,
        hazardStatusFilter,
        hazardReviewFilter,
        hazardOverdueFilter,
        hazardTimeFilter,
        hazardKeyword: hazardKeyword || undefined,
        hazardQuickFilter,
      },
      true,
    )
  }, [page, selectedEnterpriseId, hazardEnterpriseId, hazardListScope, selectedHazardId, hazardLevelFilter, hazardStatusFilter, hazardReviewFilter, hazardOverdueFilter, hazardTimeFilter, hazardKeyword, hazardQuickFilter])

  useEffect(() => {
    if (page === 'scoreDetail') navigateToRoute({ page: 'scoreDetail', selectedMonth, snapshotEnterpriseFilter, snapshotRiskFilter, selectedSnapshotId: selectedSnapshotId || undefined }, true)
    if (page === 'scoreTrend') navigateToRoute({ page: 'scoreTrend', enterpriseId: selectedEnterpriseId, selectedMonth }, true)
    if (page === 'devices') navigateToRoute({ page: 'devices', selectedMonth, selectedRecordId: selectedRecordId || undefined, recordEnterpriseFilter, recordTypeFilter, recordExecutorFilter, recordTimeFilter, recordStatusFilter, recordQuickFilter }, true)
    if (page === 'scoreConfig' || page === 'users' || page === 'bigscreen' || page === 'enterprises' || page === 'dashboard') navigateToRoute({ page }, true)
  }, [page, selectedEnterpriseId, selectedMonth, snapshotEnterpriseFilter, snapshotRiskFilter, selectedSnapshotId, selectedRecordId, recordEnterpriseFilter, recordTypeFilter, recordExecutorFilter, recordTimeFilter, recordStatusFilter, recordQuickFilter])

  useEffect(() => {
    if (page === 'scoreDetail' && snapshotEnterpriseFilter !== 'all') {
      setSelectedEnterpriseId(snapshotEnterpriseFilter)
    }
  }, [page, snapshotEnterpriseFilter])

  const openTaskCenter = (scope: TaskListScope, taskId?: string, pushHistory = false) => {
    const scopedRows = taskCenterRows.filter(item => {
      if (scope === 'today') return item.status !== '已闭环' && item.dueTime <= dashboardToday
      if (scope === 'weekCompleted') return item.status === '已闭环' && item.dueTime >= weekStart && item.dueTime <= dashboardToday
      if (scope === 'monthly') return item.dueTime.startsWith(dashboardMonth) || item.assignTime.startsWith(dashboardMonth)
      return true
    })
    const nextTaskId = taskId || scopedRows[0]?.taskId || ''
    const nextRoute: AppRouteState = { page: 'tasks', taskListScope: scope, taskId: nextTaskId, taskEnterpriseFilter: 'all', taskTypeFilter: 'all', taskStatusFilter: 'all', taskPriorityFilter: 'all', taskTimeFilter: 'all', taskAssigneeFilter: 'all', taskQuickFilter: 'all' }
    if (pushHistory) {
      navigateToRoute(nextRoute)
      return
    }
    setTaskListScope(scope)
    setSelectedTaskId(nextTaskId)
    setTaskEnterpriseFilter('all')
    setTaskTypeFilter('all')
    setTaskStatusFilter('all')
    setTaskPriorityFilter('all')
    setTaskTimeFilter('all')
    setTaskAssigneeFilter('all')
    setTaskQuickFilter('all')
    if (page !== 'tasks') navigateToRoute(nextRoute)
  }

  const openEnterpriseDetail = (enterpriseId: string, pushHistory = false) => {
    if (pushHistory || page !== 'detail') {
      navigateToRoute({ page: 'detail', enterpriseId, selectedMonth: dashboardMonth })
      return
    }
    setSelectedEnterpriseId(enterpriseId)
    setSelectedMonth(dashboardMonth)
    setDetailSnapshotMonth(null)
  }

  const openTaskEnterpriseDetail = (task: TaskCenterItem) => {
    navigateToRoute({ page: 'detail', enterpriseId: task.enterpriseId, selectedMonth: dashboardMonth })
  }

  const openTaskHazards = (task: TaskCenterItem) => {
    navigateToRoute({
      page: 'hazards',
      enterpriseId: task.enterpriseId,
      hazardEnterpriseId: task.enterpriseId,
      hazardListScope: task.status === '待复查' ? 'pendingReview' : task.status === '已超期' ? 'overdueOpen' : 'all',
    })
  }

  const switchPortraitEnterprise = (enterpriseId: string) => {
    setSelectedEnterpriseId(enterpriseId)
    setSelectedMonth(dashboardMonth)
    setDetailSnapshotMonth(null)
  }

  const openPortraitHazard = (hazardId: string) => {
    const hazard = hazards.find(item => item.id === hazardId)
    if (!hazard) return
    navigateToRoute({
      page: 'hazards',
      enterpriseId: selectedEnterprise.id,
      hazardEnterpriseId: selectedEnterprise.id,
      hazardListScope: hazard.status === '待复查' ? 'pendingReview' : hazard.deadline < dashboardToday && hazard.status !== '已闭环' ? 'overdueOpen' : 'all',
      selectedMonth,
      detailSnapshotMonth: detailSnapshotMonth || undefined,
    })
  }

  const openPortraitTask = (taskId: string) => {
    navigateToRoute({
      page: 'tasks',
      enterpriseId: selectedEnterprise.id,
      taskId,
      taskListScope: 'all',
      taskEnterpriseFilter: selectedEnterprise.id,
      taskTypeFilter: 'all',
      taskStatusFilter: 'all',
      taskPriorityFilter: 'all',
      taskTimeFilter: 'all',
      taskAssigneeFilter: 'all',
      taskQuickFilter: 'all',
      selectedMonth,
      detailSnapshotMonth: detailSnapshotMonth || undefined,
    })
  }

  const openPortraitSnapshot = (month: string) => {
    setSelectedMonth(month)
    setDetailSnapshotMonth(month)
  }

  const openHazardDetail = (hazardId: string) => {
    setSelectedHazardId(hazardId)
  }

  const openHazardEnterprise = (enterpriseId: string) => {
    navigateToRoute({ page: 'detail', enterpriseId, selectedMonth })
  }

  const openHazardSourceTask = (taskId: string, enterpriseId: string) => {
    navigateToRoute({
      page: 'tasks',
      taskId,
      taskListScope: 'all',
      taskEnterpriseFilter: enterpriseId,
      taskTypeFilter: 'all',
      taskStatusFilter: 'all',
      taskPriorityFilter: 'all',
      taskTimeFilter: 'all',
      taskAssigneeFilter: 'all',
      taskQuickFilter: 'all',
    })
  }

  const openSnapshotDetail = (snapshotId: string, enterpriseId?: string) => {
    if (enterpriseId) {
      setSnapshotEnterpriseFilter(enterpriseId)
      setSelectedEnterpriseId(enterpriseId)
    }
    setSelectedSnapshotId(snapshotId)
  }

  const openSnapshotEnterprise = (enterpriseId: string, month: string) => {
    navigateToRoute({ page: 'detail', enterpriseId, selectedMonth: month })
  }

  const openSnapshotRecords = (enterpriseId: string, month: string) => {
    navigateToRoute({
      page: 'devices',
      selectedMonth: month,
      recordEnterpriseFilter: enterpriseId,
      recordTypeFilter: 'all',
      recordExecutorFilter: 'all',
      recordTimeFilter: 'thisMonth',
      recordStatusFilter: 'all',
      recordQuickFilter: 'all',
    })
  }

  const openSnapshotHazards = (enterpriseId: string) => {
    navigateToRoute({
      page: 'hazards',
      enterpriseId,
      hazardEnterpriseId: enterpriseId,
      hazardListScope: 'all',
      hazardLevelFilter: 'all',
      hazardStatusFilter: 'all',
      hazardReviewFilter: 'all',
      hazardOverdueFilter: 'all',
      hazardTimeFilter: 'thisMonth',
      hazardQuickFilter: 'all',
    })
  }

  const openRecordDetail = (recordId: string) => {
    setSelectedRecordId(recordId)
  }

  const openPage = (nextPage: PageKey) => {
    if (nextPage === 'dashboard') navigateToRoute({ page: 'dashboard' })
    else if (nextPage === 'tasks') navigateToRoute({ page: 'tasks', taskListScope, taskId: selectedTaskId || undefined, taskEnterpriseFilter, taskTypeFilter, taskStatusFilter, taskPriorityFilter, taskTimeFilter, taskAssigneeFilter, taskQuickFilter })
    else if (nextPage === 'enterprises') navigateToRoute({ page: 'enterprises' })
    else if (nextPage === 'detail') navigateToRoute({ page: 'detail', enterpriseId: selectedEnterpriseId, selectedMonth, detailSnapshotMonth: detailSnapshotMonth || undefined })
    else if (nextPage === 'hazards') navigateToRoute({ page: 'hazards', enterpriseId: selectedEnterpriseId || undefined, hazardEnterpriseId: hazardEnterpriseId || undefined, hazardListScope, selectedHazardId: selectedHazardId || undefined, hazardLevelFilter, hazardStatusFilter, hazardReviewFilter, hazardOverdueFilter, hazardTimeFilter, hazardKeyword: hazardKeyword || undefined, hazardQuickFilter })
    else if (nextPage === 'scoreDetail') navigateToRoute({ page: 'scoreDetail', selectedMonth, snapshotEnterpriseFilter, snapshotRiskFilter, selectedSnapshotId: selectedSnapshotId || undefined })
    else if (nextPage === 'devices') navigateToRoute({ page: 'devices', selectedMonth, selectedRecordId: selectedRecordId || undefined, recordEnterpriseFilter, recordTypeFilter, recordExecutorFilter, recordTimeFilter, recordStatusFilter, recordQuickFilter })
    else navigateToRoute({ page: nextPage, enterpriseId: selectedEnterpriseId, selectedMonth })
  }

  const openEvidencePicker = () => {
    evidenceInputRef.current?.click()
  }

  const handleTaskEvidenceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!selectedTask || !files.length) return
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (!imageFiles.length) {
      setMessage('请选择图片文件后再上传')
      event.target.value = ''
      return
    }

    const uploadedRows = await Promise.all(
      imageFiles.map(
        file =>
          new Promise<UploadedTaskEvidence>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                id: `${selectedTask.taskId}-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                title: file.name.replace(/\.[^.]+$/, ''),
                time: `${dashboardToday} 18:00`,
                previewUrl: String(reader.result || ''),
                description: `由${selectedTask.assignee}补录上传，已绑定到当前任务。`,
              })
            reader.onerror = () => reject(new Error('read-failed'))
            reader.readAsDataURL(file)
          }),
      ),
    )

    setTaskUploadedEvidence(prev => ({
      ...prev,
      [selectedTask.taskId]: [...(prev[selectedTask.taskId] || []), ...uploadedRows],
    }))
    setMessage(`已为${selectedTask.taskName}补录 ${uploadedRows.length} 张现场图片`)
    event.target.value = ''
  }

  const removeTaskEvidence = (taskId: string, evidenceId: string) => {
    setTaskUploadedEvidence(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter(item => item.id !== evidenceId),
    }))
    setMessage('已删除该现场图片')
  }

  const overviewCards = [
    { key: 'today', title: '今日待执行任务数', value: `${taskCountToday}项`, desc: '进入任务中心查看今天必须处理的任务清单。', icon: ClipboardCheck, action: () => openTaskCenter('today', undefined, true) },
    { key: 'week', title: '本周已完成任务数', value: `${taskCompletedWeek}项`, desc: '查看本周已交付和待验收任务。', icon: CalendarDays, action: () => openTaskCenter('weekCompleted', undefined, true) },
    { key: 'review', title: '待复查隐患数', value: `${hazardPendingReview}项`, desc: '直达待复查隐患清单，优先安排复核。', icon: FileWarning, action: () => navigateToRoute({ page: 'hazards', hazardListScope: 'pendingReview' }) },
    { key: 'overdue', title: '超期未闭环数', value: `${overdueOpenCount}项`, desc: '查看超期未闭环隐患，优先催办闭环。', icon: AlertTriangle, action: () => navigateToRoute({ page: 'hazards', hazardListScope: 'overdueOpen' }) },
    { key: 'covered', title: '已覆盖企业数 / 总企业数', value: `${enterpriseCoveredCount}/${enterpriseTotalCount}`, desc: '查看本月已服务企业覆盖情况。', icon: Building2, action: () => navigateToRoute({ page: 'enterprises' }) },
    { key: 'completion', title: '本月服务完成率', value: `${monthlyServiceCompletionRate}%`, desc: '查看本月任务推进进度和待交付事项。', icon: Gauge, action: () => openTaskCenter('monthly', undefined, true) },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge"><ShieldCheck className="icon-md" /></div>
          <div>
            <div className="brand-title">安全服务中台</div>
            <div className="brand-subtitle">可配置评分机制试用版</div>
          </div>
        </div>
        <div className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.key} onClick={() => openPage(item.key)} className={cn('nav-btn', page === item.key && 'nav-btn-active')}><span className="inline-row"><Icon className="icon-sm" /><span>{item.label}</span></span><ChevronRight className="icon-sm faint" /></button>
          })}
        </div>
      </aside>

      <div className="app-main">
        <div className="sticky-header">
          <div>
            <div className="page-title">安全服务中台试用版</div>
            <div className="page-subtitle">评分方案配置、规则映射、月度快照、扣分明细与评分趋势</div>
          </div>
          <div className="button-row">
            {perspectives.map(item => {
              const Icon = item.icon
              return <button key={item.key} onClick={() => setPerspective(item.key)} className={cn('btn role-btn', perspective === item.key ? 'btn-dark' : 'btn-light')}><Icon className="icon-sm" />{item.label}</button>
            })}
          </div>
        </div>

        <div className="content-wrap">
          {message && <div className="notice">{message}</div>}

          {page === 'dashboard' && <div className="stack-lg"><div className="hero-banner"><div><div className="hero-title">服务商首页</div><div className="hero-desc">今天先处理到期任务和待复查隐患，再关注高风险企业的闭环压力；下方工作台同时给出行动入口、风险提醒和月度交付结果。</div></div><PerspectiveBadge value="安全服务商" /></div><div className="overview-grid">{overviewCards.map(item => { const Icon = item.icon; return <button key={item.key} className="overview-card" onClick={item.action}><div className="overview-card-head"><div><div className="overview-card-title">{item.title}</div><div className="overview-card-value">{item.value}</div></div><div className="overview-card-icon"><Icon className="icon-md" /></div></div><div className="overview-card-desc">{item.desc}</div></button> })}</div><div className="dashboard-main-grid"><Card title="今日待办任务" extra={<div className="inline-row"><Badge tone="amber">{filteredTodayTaskRows.length} 项待处理</Badge><button className="btn btn-xs btn-light" onClick={() => openTaskCenter('today', filteredTodayTaskRows[0]?.id, true)}>查看全部</button></div>}><div className="dashboard-filter-row"><Select value={dashboardEnterpriseFilter} onChange={setDashboardEnterpriseFilter} options={enterpriseFilterOptions} /><Select value={dashboardStatusFilter} onChange={setDashboardStatusFilter} options={taskStatusOptions} /><Select value={dashboardPriorityFilter} onChange={value => setDashboardPriorityFilter(value as 'all' | TaskPriority)} options={priorityOptions} /></div><div className="spacer-sm" />{filteredTodayTaskRows.length ? <Table className="task-table" columns={['任务名称', '企业名称', '任务类型', '截止时间', '当前状态', '优先级', '操作']} rows={filteredTodayTaskRows} renderRow={item => <tr key={item.id} className="clickable-row" onClick={() => openTaskCenter('today', item.id, true)}><td className="cell strong wrap-cell">{item.taskName}</td><td className="wrap-cell">{item.enterpriseName}</td><td>{item.taskType}</td><td>{item.dueDate}</td><td><StatusBadge value={item.taskStatus} /></td><td><PriorityBadge value={item.priority} /></td><td><button className="btn btn-xs btn-dark" onClick={event => { event.stopPropagation(); openTaskCenter('today', item.id, true) }}>查看详情</button></td></tr>} /> : <div className="empty-state">当前筛选条件下没有待办任务。</div>}</Card><Card title="风险提醒" extra={<Badge tone="red">优先跟进高风险企业</Badge>}><div className="risk-list">{riskRows.map(item => <button key={item.enterpriseId} className="risk-item" onClick={() => openEnterpriseDetail(item.enterpriseId, true)}><div className="risk-item-head"><div><div className="title-sm">{item.enterpriseName}</div><div className="small muted">最近一次服务时间：{item.lastServiceDate}</div></div><RiskBadge level={item.riskLevel} /></div><div className="risk-item-grid"><div className="surface-box"><div className="muted">未闭环隐患数</div><div className="title-sm">{item.openHazardCount}</div></div><div className="surface-box"><div className="muted">超期项数</div><div className="title-sm">{item.overdueCount}</div></div></div></button>)}</div></Card></div><Card title="月度交付概览" extra={<Badge tone="cyan">截至 {dashboardMonth}</Badge>}><div className="delivery-grid"><div className="mini-card"><div className="muted">已完成任务数</div><div className="title-sm">{monthlyCompletedTaskCount} 项</div></div><div className="mini-card"><div className="muted">闭环隐患数</div><div className="title-sm">{monthlyClosedHazardCount} 项</div></div><div className="mini-card"><div className="muted">本月新增隐患数</div><div className="title-sm">{monthlyNewHazardCount} 项</div></div><div className="mini-card"><div className="muted">企业覆盖率</div><div className="title-sm">{enterpriseCoverageRate}%</div></div><div className="mini-card"><div className="muted">月度快照已生成企业数</div><div className="title-sm">{monthlySnapshotEnterpriseCount} 家</div></div></div></Card></div>}

          {page === 'enterprises' && <Card title={`${perspective}企业列表`} extra={<div className="search-wrap"><Search className="search-icon" /><input className="search-input" value={selectedEnterprise.name} readOnly /></div>}><Table columns={['企业名称', '行业', '区域', '试用版得分', '等级', '高风险隐患', '操作']} rows={enterprises} renderRow={(item: Enterprise) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.industry}</td><td>{item.area}</td><td>{latestMap[item.id].totalScore}</td><td><Badge tone={latestMap[item.id].levelColor}>{latestMap[item.id].levelName}</Badge></td><td>{hazards.filter(h => h.enterpriseId === item.id && h.level === '高' && h.status !== '已闭环').length}</td><td><div className="button-row"><button className="btn btn-xs btn-light" onClick={() => openEnterpriseDetail(item.id)}>详情</button><button className="btn btn-xs btn-dark" onClick={() => navigateToRoute({ page: 'scoreDetail', selectedMonth, snapshotEnterpriseFilter: item.id })}>快照</button></div></td></tr>} /></Card>}

          {page === 'detail' && (
            <div className="stack-lg">
              <div className="entity-switch">
                {enterprises.map(item => (
                  <button key={item.id} onClick={() => switchPortraitEnterprise(item.id)} className={cn('entity-chip', item.id === selectedEnterpriseId && 'entity-chip-active')}>
                    {item.name}
                  </button>
                ))}
              </div>

              <div className="hero-banner portrait-hero">
                <div>
                  <div className="hero-title">{selectedEnterprise.name}</div>
                  <div className="hero-desc">先看当前风险和服务结果，再看隐患整改过程，最后看近几个月的变化趋势，帮助企业侧和保险侧快速形成一致判断。</div>
                </div>
                <div className="inline-row">
                  <PerspectiveBadge value={perspective} />
                  <Badge tone={insuranceStatusTone[selectedEnterpriseInsuranceStatus]}>{selectedEnterpriseInsuranceStatus}</Badge>
                  <RiskBadge level={portraitHazardRows.some(item => item.overdue) ? '高' : selectedEnterprise.risk} />
                </div>
              </div>

              <div className="two-col-hero portrait-result-grid">
                <Card title="企业基础信息区" extra={<div className="inline-row"><Badge tone={insuranceStatusTone[selectedEnterpriseInsuranceStatus]}>{selectedEnterpriseInsuranceStatus}</Badge><Badge tone="blue">最近服务：{latestServiceDateByEnterprise[selectedEnterprise.id]}</Badge></div>}>
                  <div className="info-grid">
                    <div className="info-field">
                      <div className="field-label with-icon"><Factory className="icon-xs" /> 企业名称</div>
                      <div className="field-value">{selectedEnterprise.name}</div>
                    </div>
                    <div className="info-field">
                      <div className="field-label with-icon"><LayoutGrid className="icon-xs" /> 行业类型</div>
                      <div className="field-value">{selectedEnterprise.industry}</div>
                    </div>
                    <div className="info-field">
                      <div className="field-label with-icon"><MapPinned className="icon-xs" /> 所属区域</div>
                      <div className="field-value">{selectedEnterprise.area}</div>
                    </div>
                    <div className="info-field">
                      <div className="field-label with-icon"><Briefcase className="icon-xs" /> 联系人</div>
                      <div className="field-value">{selectedEnterprise.leader}</div>
                    </div>
                    <div className="info-field">
                      <div className="field-label with-icon"><Users className="icon-xs" /> 联系方式</div>
                      <div className="field-value">{selectedEnterprise.phone}</div>
                    </div>
                    <div className="info-field">
                      <div className="field-label with-icon"><ShieldCheck className="icon-xs" /> 在保状态</div>
                      <div className="field-value">{selectedEnterpriseInsuranceStatus}</div>
                    </div>
                  </div>
                </Card>

                <Card title="当前风险概况区" extra={<div className="inline-row"><RiskBadge level={portraitHazardRows.some(item => item.overdue) ? '高' : selectedEnterprise.risk} /><Badge tone={latestMap[selectedEnterprise.id].levelColor}>{latestMap[selectedEnterprise.id].levelName}</Badge></div>}>
                  <div className="portrait-risk-panel">
                    <div className="portrait-risk-main">
                      <div>
                        <div className="muted">当前风险等级</div>
                        <div className="portrait-risk-value">{portraitHazardRows.some(item => item.overdue) ? '高风险' : `${selectedEnterprise.risk}风险`}</div>
                      </div>
                      <div className="small muted">最近服务时间：{latestServiceDateByEnterprise[selectedEnterprise.id]}</div>
                    </div>
                    <div className="summary-grid">
                      <div className="mini-card">
                        <div className="muted">当前月度得分</div>
                        <div className="title-sm">{portraitMonthlyScore}</div>
                      </div>
                      <div className="mini-card">
                        <div className="muted">未闭环隐患数</div>
                        <div className="title-sm">{portraitHazardRows.length} 项</div>
                      </div>
                      <div className="mini-card portrait-alert-card">
                        <div className="muted">超期整改数</div>
                        <div className="title-sm">{portraitOverdueHazardCount} 项</div>
                      </div>
                      <div className="mini-card">
                        <div className="muted">巡检覆盖率</div>
                        <div className="title-sm">{portraitInspectionCoverageRate}%</div>
                      </div>
                      <div className="mini-card">
                        <div className="muted">本月服务次数</div>
                        <div className="title-sm">{portraitMonthlyServiceCount} 次</div>
                      </div>
                      <div className="mini-card">
                        <div className="muted">当前月度等级</div>
                        <div className="title-sm">{latestMap[selectedEnterprise.id].levelName}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="two-col portrait-process-grid">
                <Card title="隐患与整改区" extra={<Badge tone={portraitOverdueHazardCount > 0 ? 'red' : 'amber'}>{portraitHazardRows.length} 项待跟进</Badge>}>
                  {portraitHazardRows.length ? (
                    <Table
                      columns={['隐患项名称', '严重程度', '责任人', '整改期限', '当前状态']}
                      rows={portraitHazardRows}
                      renderRow={item => (
                        <tr key={item.id} className={cn('clickable-row', item.overdue && 'row-active')} onClick={() => openPortraitHazard(item.id)}>
                          <td className="cell strong wrap-cell">{item.title}</td>
                          <td><RiskBadge level={item.level} /></td>
                          <td>{item.owner}</td>
                          <td>{item.deadline}</td>
                          <td><StatusBadge value={item.overdue ? '已超期' : item.status} /></td>
                        </tr>
                      )}
                    />
                  ) : (
                    <div className="empty-state">当前没有未闭环隐患，企业整改处于稳定状态。</div>
                  )}
                </Card>

                <Card title="服务记录区" extra={<Badge tone="blue">最近服务动作</Badge>}>
                  <div className="portrait-service-list">
                    {portraitServiceRecords.map(item => (
                      <button key={item.id} className="portrait-service-item" onClick={() => openPortraitTask(item.relatedTaskId)}>
                        <div className="list-card-head">
                          <div>
                            <div className="title-sm">{item.serviceType}</div>
                            <div className="small muted">{item.time} · {item.executor}</div>
                          </div>
                          <StatusBadge value={item.status} />
                        </div>
                        <div className="body">{item.summary}</div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              <Card title="月度快照趋势区" extra={<Badge tone="cyan">最近 {portraitTrendRows.length} 个月</Badge>}>
                <div className="portrait-month-switch">
                  {portraitTrendRows.map(item => (
                    <button key={item.month} className={cn('entity-chip', selectedMonth === item.month && 'entity-chip-active')} onClick={() => setSelectedMonth(item.month)}>
                      {item.month}
                    </button>
                  ))}
                </div>
                <div className="portrait-trend-grid">
                  {portraitTrendRows.map(item => (
                    <button key={item.month} className={cn('portrait-trend-card', selectedMonth === item.month && 'portrait-trend-card-active')} onClick={() => openPortraitSnapshot(item.month)}>
                      <div className="list-card-head">
                        <div>
                          <div className="title-sm">{item.month}</div>
                          <div className="small muted">{item.note}</div>
                        </div>
                        <div className="inline-row">
                          <Badge tone={item.levelColor}>{item.levelName}</Badge>
                          <RiskBadge level={item.riskLevel} />
                        </div>
                      </div>
                      <div className="portrait-trend-stats">
                        <div className="mini-card">
                          <div className="muted">得分变化</div>
                          <div className="title-sm">{item.score}</div>
                        </div>
                        <div className="mini-card">
                          <div className="muted">闭环率变化</div>
                          <div className="title-sm">{item.closedRate}%</div>
                        </div>
                        <div className="mini-card">
                          <div className="muted">关键备注</div>
                          <div className="title-sm">{item.hazardChange}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {page === 'scoreDetail' && (
            <div className="stack-lg">
              <div className="section-head">
                <div>
                  <div className="section-title">月度快照页</div>
                  <div className="page-subtitle">先看本月结果，再看趋势变化，再回看主要风险项和服务结论，形成对企业、服务和保险都能解释得通的月度输出。</div>
                </div>
                <div className="button-row">
                  <button className="btn btn-dark" onClick={buildSnapshot}>生成本月快照</button>
                  {(selectedSnapshot || visibleSnapshot) && <button className="btn btn-light" onClick={() => setDrawer({ snapshotId: (selectedSnapshot?.detail || visibleSnapshot).id })}><PanelRightOpen className="icon-sm" />查看扣分明细</button>}
                </div>
              </div>

              <Card title="顶部总览区" extra={<Badge tone="cyan">{selectedMonth}</Badge>}>
                <div className="score-toolbar">
                  <div className="score-toolbar-group">
                    <div className="field-label">月份</div>
                    <Select value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
                  </div>
                  <div className="score-toolbar-group">
                    <div className="field-label">企业</div>
                    <Select
                      value={snapshotEnterpriseFilter}
                      onChange={value => {
                        setSnapshotEnterpriseFilter(value)
                        if (value !== 'all') setSelectedEnterpriseId(value)
                      }}
                      options={[{ value: 'all', label: '全部企业' }, ...entOptions]}
                    />
                  </div>
                  <div className="score-toolbar-group">
                    <div className="field-label">风险等级</div>
                    <Select value={snapshotRiskFilter} onChange={setSnapshotRiskFilter} options={snapshotRiskOptions} />
                  </div>
                </div>
                <div className="spacer-sm" />
                <div className="grid-4">
                  <StatCard title="本月快照企业数" value={`${snapshotOverview.enterpriseCount}家`} subtitle="当前筛选范围内已形成月度输出" icon={Building2} />
                  <StatCard title="高风险企业数" value={`${snapshotOverview.highRiskCount}家`} subtitle="建议优先复核和跟踪整改" icon={ShieldAlert} />
                  <StatCard title="本月平均得分" value={snapshotOverview.avgScore} subtitle="综合当前月度快照结果" icon={Calculator} />
                  <StatCard title="本月闭环率" value={`${snapshotOverview.closureRate}%`} subtitle={`环比 ${snapshotOverview.monthOnMonth >= 0 ? '+' : ''}${snapshotOverview.monthOnMonth} 分`} icon={LineChart} />
                </div>
              </Card>

              <div className="workspace-two-col">
                <div className="stack-lg">
                  <Card title="快照列表区" extra={<Badge tone="blue">{filteredSnapshotRows.length} 条快照</Badge>}>
                    {filteredSnapshotRows.length ? (
                      <Table
                        columns={['企业名称', '月份', '本月得分', '风险等级', '巡检覆盖率', '闭环率', '超期数', '趋势状态', '操作']}
                        rows={filteredSnapshotRows}
                        renderRow={item => (
                          <tr key={item.snapshotId} className={cn('clickable-row', selectedSnapshotId === item.snapshotId && 'row-active')} onClick={() => openSnapshotDetail(item.snapshotId, item.enterpriseId)}>
                            <td className="cell strong wrap-cell">{item.enterpriseName}</td>
                            <td>{item.snapshotMonth}</td>
                            <td>{item.monthlyScore}</td>
                            <td><RiskBadge level={item.riskLevel} /></td>
                            <td>{item.inspectionCoverageRate}%</td>
                            <td>{item.closureRate}%</td>
                            <td>{item.overdueCount}</td>
                            <td><Badge tone={item.trendStatus === '持续向好' ? 'emerald' : item.trendStatus === '下滑预警' ? 'red' : 'slate'}>{item.trendStatus}</Badge></td>
                            <td><button className="btn btn-xs btn-dark" onClick={event => { event.stopPropagation(); openSnapshotDetail(item.snapshotId, item.enterpriseId) }}>查看详情</button></td>
                          </tr>
                        )}
                      />
                    ) : (
                      <div className="empty-state">当前筛选条件下没有月度快照，请调整月份或企业范围。</div>
                    )}
                  </Card>

                  <Card title="趋势分析区" extra={<Badge tone="violet">近 4 个月</Badge>}>
                    <div className="trend-list">
                      {snapshotTrendRows.map(item => (
                        <div key={item.month} className="trend-item">
                          <div className="list-card-head">
                            <div>
                              <div className="title-sm">{item.month}</div>
                              <div className="small muted">{item.note}</div>
                            </div>
                            <Badge tone={item.highRiskCount > 2 ? 'red' : item.highRiskCount > 0 ? 'amber' : 'emerald'}>{item.highRiskCount} 家高风险</Badge>
                          </div>
                          <div className="trend-metrics">
                            <div className="mini-card">
                              <div className="muted">得分变化</div>
                              <div className="title-sm">{item.avgScore}</div>
                            </div>
                            <div className="mini-card">
                              <div className="muted">风险等级变化</div>
                              <div className="title-sm">{item.highRiskCount} 家重点关注</div>
                            </div>
                            <div className="mini-card">
                              <div className="muted">闭环率变化</div>
                              <div className="title-sm">{item.closureRate}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <Card title="快照详情区" extra={selectedSnapshot ? <Badge tone={selectedSnapshot.levelColor}>{selectedSnapshot.levelName}</Badge> : <Badge tone="slate">请选择企业快照</Badge>}>
                  {selectedSnapshot ? (
                    <div className="stack-lg">
                      <div className="summary-grid">
                        <div className="mini-card">
                          <div className="muted">企业名称</div>
                          <div className="title-sm">{selectedSnapshot.enterpriseName}</div>
                        </div>
                        <div className="mini-card">
                          <div className="muted">风险等级</div>
                          <div className="title-sm">{selectedSnapshot.riskLevel}风险</div>
                        </div>
                        <div className="mini-card">
                          <div className="muted">本月得分</div>
                          <div className="title-sm">{selectedSnapshot.monthlyScore}</div>
                        </div>
                        <div className="mini-card">
                          <div className="muted">与上月对比</div>
                          <div className="title-sm">{selectedSnapshot.monthlyScore - selectedSnapshot.previousScore >= 0 ? '+' : ''}{selectedSnapshot.monthlyScore - selectedSnapshot.previousScore} 分</div>
                        </div>
                      </div>

                      <div className="surface-outline">
                        <div className="section-subtitle">本月关键指标</div>
                        <div className="delivery-grid">
                          <div className="mini-card"><div className="muted">巡检覆盖率</div><div className="title-sm">{selectedSnapshot.inspectionCoverageRate}%</div></div>
                          <div className="mini-card"><div className="muted">闭环率</div><div className="title-sm">{selectedSnapshot.closureRate}%</div></div>
                          <div className="mini-card"><div className="muted">超期数</div><div className="title-sm">{selectedSnapshot.overdueCount} 项</div></div>
                          <div className="mini-card"><div className="muted">服务次数</div><div className="title-sm">{selectedSnapshot.serviceCount} 次</div></div>
                        </div>
                      </div>

                      <div className="surface-outline">
                        <div className="section-subtitle">主要扣分 / 风险项</div>
                        <div className="todo-list">
                          {selectedSnapshot.mainRisks.map(item => (
                            <div key={item.id} className="todo-item">
                              <div className="title-sm">{item.ruleName}</div>
                              <div className="body">扣减 {item.deducted} 分，原因：{item.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="surface-outline">
                        <div className="section-subtitle">本月服务记录摘要</div>
                        <div className="body mt-8">{selectedSnapshot.serviceSummary}</div>
                        <div className="body">趋势判断：{selectedSnapshot.trendStatus}</div>
                        <div className="body">关键备注：{selectedSnapshot.snapshotRemark}</div>
                      </div>

                      <div className="surface-outline">
                        <div className="section-subtitle">输出结论区</div>
                        <div className="body mt-8">建议关注等级：{selectedSnapshot.riskLevel === '高' ? '重点关注' : selectedSnapshot.riskLevel === '中' ? '持续关注' : '常规跟踪'}</div>
                        <div className="body">是否建议重点复核：{selectedSnapshot.reviewSuggestion}</div>
                        <div className="body">服务改进建议：{selectedSnapshot.snapshotRemark}</div>
                        <div className="body">备注结论：{selectedSnapshot.riskTrend}</div>
                      </div>

                      <div className="button-row">
                        <button className="btn btn-dark" onClick={() => openSnapshotEnterprise(selectedSnapshot.enterpriseId, selectedSnapshot.snapshotMonth)}>查看企业画像</button>
                        <button className="btn btn-light" onClick={() => openSnapshotRecords(selectedSnapshot.enterpriseId, selectedSnapshot.snapshotMonth)}>查看本月服务记录</button>
                        <button className="btn btn-light" onClick={() => openSnapshotHazards(selectedSnapshot.enterpriseId)}>查看本月隐患闭环</button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">请先从左侧快照列表中选择一家企业，查看本月结果、趋势变化和管理结论。</div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {page === 'scoreTrend' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">评分趋势页</div><div className="page-subtitle">按企业查看历史快照，不做覆盖，只追加新月份。</div></div><button className="btn btn-dark" onClick={buildSnapshot}>生成当前月份快照</button></div><div className="score-toolbar"><div className="score-toolbar-group"><div className="field-label">企业</div><Select value={selectedEnterpriseId} onChange={setSelectedEnterpriseId} options={entOptions} /></div><div className="score-toolbar-group"><div className="field-label">说明</div><div className="surface-outline"><div className="title-sm">{selectedEnterprise.name}</div><div className="small muted">已保存 {trendRows.length} 条评分历史</div></div></div></div><Card title="月度趋势" extra={<Badge tone="cyan">历史快照不覆盖</Badge>}><div className="stack">{trendRows.map(item => <div key={item.id} className="surface-outline"><div className="list-card-head"><div><div className="title-sm">{item.month}</div><div className="small muted">{item.generatedAt}</div></div><div className="inline-row"><Badge tone={item.levelColor}>{item.levelName}</Badge><div className="title-sm">{item.totalScore}</div></div></div><div className="spacer-sm" /><div className="progress-track"><div className="progress-bar progress-blue" style={{ width: `${item.totalScore}%` }} /></div><div className="score-trend-grid">{item.dimensionScores.map(dimension => <div key={dimension.dimensionId} className="mini-card"><div className="muted">{dimension.dimensionName}</div><div className="title-sm">{dimension.score}/{dimension.fullScore}</div></div>)}</div></div>)}</div></Card></div>}

          {page === 'scoreConfig' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">评分机制配置页</div><div className="page-subtitle">支持评分方案、维度、规则、等级区间的试用态配置。</div></div><button className="btn btn-dark" onClick={() => setMessage('评分配置已保存在前端试用态')}>保存配置</button></div><Card title="评分方案" extra={<Badge tone="violet">试用版</Badge>}><Table columns={['方案名称', '版本', '状态', '生效时间', '快照策略', '描述', '操作']} rows={schemeRows} renderRow={(item: ScoreScheme) => <tr key={item.id}><td className="cell strong">{item.name}</td><td>{item.version}</td><td><StatusBadge value={item.status} /></td><td>{item.effectiveFrom}</td><td>{item.snapshotPolicy}</td><td className="wrap-cell">{item.description}</td><td><button className="btn btn-xs btn-light" onClick={() => { setSchemeRows(prev => prev.map(row => ({ ...row, status: row.id === item.id ? '启用' : '草稿' }))); setMessage(`已切换启用方案：${item.name}`) }}>设为启用</button></td></tr>} /></Card><div className="two-col"><Card title="评分维度" extra={<Badge tone="cyan">当前方案</Badge>}><Table columns={['维度编码', '维度名称', '权重', '排序', '说明']} rows={dimensionRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreDimension) => <tr key={item.id}><td>{item.code}</td><td className="cell strong">{item.name}</td><td><input className="inline-input" type="number" value={item.weight} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, weight: Number(event.target.value) } : row))} /></td><td><input className="inline-input" type="number" value={item.order} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, order: Number(event.target.value) } : row))} /></td><td className="wrap-cell"><input className="inline-input" value={item.note} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, note: event.target.value } : row))} /></td></tr>} /></Card><Card title="评分等级区间" extra={<Badge tone="amber">快照按生成时锁定</Badge>}><Table columns={['等级', '最小值', '最大值', '颜色', '说明']} rows={levelRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreLevelRange) => <tr key={item.id}><td className="cell strong">{item.name}</td><td><input className="inline-input" type="number" value={item.min} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, min: Number(event.target.value) } : row))} /></td><td><input className="inline-input" type="number" value={item.max} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, max: Number(event.target.value) } : row))} /></td><td><select value={item.color} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, color: event.target.value as Tone } : row))}>{(['emerald', 'blue', 'amber', 'red'] as Tone[]).map(tone => <option key={tone} value={tone}>{tone}</option>)}</select></td><td className="wrap-cell"><input className="inline-input" value={item.description} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, description: event.target.value } : row))} /></td></tr>} /></Card></div><Card title="评分规则" extra={<Badge tone="blue">字段已预留真实接入能力</Badge>}><Table columns={['规则名称', '指标编码', '所属维度', '数据来源字段', '统计周期', '计算方式', '分值上限', '启用状态', '适用企业类型']} rows={ruleRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreRule) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.metricCode}</td><td>{dimensionRows.find(dimension => dimension.id === item.dimensionId)?.name || '-'}</td><td className="wrap-cell">{item.dataSourceField}</td><td>{item.statPeriod}</td><td>{item.calcMethod}</td><td>{item.maxScore}</td><td>{item.enabled ? <Badge tone="emerald">启用</Badge> : <Badge tone="slate">停用</Badge>}</td><td className="wrap-cell">{item.enterpriseTypes.join(' / ')}</td></tr>} /></Card></div>}

          {page === 'hazards' && (
            <div className="stack-lg">
              <div className="section-head">
                <div>
                  <div className="section-title">{hazardListScope === 'pendingReview' ? '待复查隐患闭环页' : hazardListScope === 'overdueOpen' ? '超期隐患闭环页' : '隐患闭环页'}</div>
                  <div className="page-subtitle">这里把隐患从发现、整改、复查到归档的过程串成一条闭环链，方便服务商、企业和保险侧对同一问题形成一致判断。</div>
                </div>
                <div className="inline-row">
                  {activeHazardEnterpriseName && <Badge tone="blue">{activeHazardEnterpriseName}</Badge>}
                  <Badge tone={hazardListScope === 'all' ? 'slate' : 'amber'}>{hazardRowsForPageDetailed.length} 项</Badge>
                </div>
              </div>

              <div className="task-status-grid">
                {hazardSummaryCards.map(item => (
                  <div key={item.key} className="task-status-card">
                    <div className="task-status-card-head">
                      <Badge tone={item.tone}>{item.label}</Badge>
                      <span className="task-status-count">{item.value}</span>
                    </div>
                    <div className="small muted">持续跟踪当前闭环压力和重点问题。</div>
                  </div>
                ))}
              </div>

              <Card
                title="筛选与检索区"
                extra={
                  <div className="task-quick-filters">
                    {[
                      { value: 'overdue', label: '只看超期' },
                      { value: 'pendingReview', label: '只看待复查' },
                      { value: 'highRisk', label: '只看高风险' },
                    ].map(item => (
                      <button key={item.value} className={cn('task-quick-chip', hazardQuickFilter === item.value && 'task-quick-chip-active')} onClick={() => setHazardQuickFilter(prev => (prev === item.value ? 'all' : item.value))}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="hazard-filter-grid">
                  <Select value={hazardEnterpriseId || 'all'} onChange={value => setHazardEnterpriseId(value === 'all' ? '' : value)} options={[{ value: 'all', label: '全部企业' }, ...entOptions]} />
                  <Select value={hazardLevelFilter} onChange={setHazardLevelFilter} options={hazardLevelOptions} />
                  <Select value={hazardStatusFilter} onChange={setHazardStatusFilter} options={hazardStatusOptions} />
                  <Select value={hazardReviewFilter} onChange={setHazardReviewFilter} options={hazardReviewOptions} />
                  <Select value={hazardOverdueFilter} onChange={setHazardOverdueFilter} options={hazardOverdueOptions} />
                  <Select value={hazardTimeFilter} onChange={setHazardTimeFilter} options={hazardTimeOptions} />
                  <div className="search-wrap">
                    <Search className="search-icon" />
                    <input className="search-input search-input-wide" value={hazardKeyword} onChange={event => setHazardKeyword(event.target.value)} placeholder="搜索隐患编号 / 关键词" />
                  </div>
                </div>
              </Card>

              <Card title="隐患列表区" extra={<Badge tone="blue">{hazardRowsForPageDetailed.length} 条隐患</Badge>}>
                {hazardRowsForPageDetailed.length ? (
                  <Table
                    columns={['隐患编号', '企业名称', '隐患名称 / 描述', '隐患等级', '发现时间', '整改责任人', '整改期限', '当前状态', '是否超期', '操作']}
                    rows={hazardRowsForPageDetailed}
                    renderRow={item => (
                      <tr key={item.hazardId} className={cn('clickable-row', selectedHazardId === item.hazardId && 'row-active')} onClick={() => openHazardDetail(item.hazardId)}>
                        <td>{item.hazardCode}</td>
                        <td className="wrap-cell">{item.enterpriseName}</td>
                        <td className="cell strong wrap-cell">{item.hazardName}</td>
                        <td><RiskBadge level={item.hazardLevel} /></td>
                        <td>{item.foundAt}</td>
                        <td>{item.responsiblePerson}</td>
                        <td>{item.rectificationDeadline}</td>
                        <td><StatusBadge value={item.status} /></td>
                        <td>{item.isOverdue ? <Badge tone="red">已超期</Badge> : <Badge tone="emerald">正常</Badge>}</td>
                        <td><button className="btn btn-xs btn-dark" onClick={event => { event.stopPropagation(); openHazardDetail(item.hazardId) }}>查看详情</button></td>
                      </tr>
                    )}
                  />
                ) : (
                  <div className="empty-state">当前筛选条件下没有隐患项，请调整筛选后重试。</div>
                )}
              </Card>
            </div>
          )}

          {page === 'devices' && (
            <div className="stack-lg">
              <div className="section-head">
                <div>
                  <div className="section-title">数据台账 / 服务记录页</div>
                  <div className="page-subtitle">这里沉淀服务动作、执行结果和证据完整性，帮助团队证明“服务做过、过程可追、结果可交付”。</div>
                </div>
                <Badge tone="cyan">{filteredServiceLedgerRows.length} 条记录</Badge>
              </div>

              <div className="grid-4">
                <StatCard title="本月服务次数" value={`${serviceLedgerOverview.monthlyServiceCount}次`} subtitle="本月已执行并留痕的服务动作" icon={ClipboardCheck} />
                <StatCard title="已生成记录数" value={`${serviceLedgerOverview.generatedCount}条`} subtitle="可回溯的服务记录总量" icon={LayoutGrid} />
                <StatCard title="证据完整率" value={`${serviceLedgerOverview.evidenceRate}%`} subtitle="图片、记录、结论齐套情况" icon={Eye} />
                <StatCard title="异常记录数" value={`${serviceLedgerOverview.abnormalCount}条`} subtitle={`按企业覆盖率 ${serviceLedgerOverview.coverageRate}%`} icon={AlertTriangle} />
              </div>

              <div className="workspace-two-col">
                <div className="stack-lg">
                  <Card
                    title="服务记录列表区"
                    extra={
                      <div className="task-quick-filters">
                        {[
                          { value: 'missingEvidence', label: '只看缺证据' },
                          { value: 'thisMonth', label: '只看本月' },
                          { value: 'currentEnterprise', label: '只看当前企业' },
                        ].map(item => (
                          <button key={item.value} className={cn('task-quick-chip', recordQuickFilter === item.value && 'task-quick-chip-active')} onClick={() => setRecordQuickFilter(prev => (prev === item.value ? 'all' : item.value))}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    }
                  >
                    <div className="hazard-filter-grid">
                      <Select value={recordEnterpriseFilter} onChange={setRecordEnterpriseFilter} options={[{ value: 'all', label: '全部企业' }, ...entOptions]} />
                      <Select value={recordTypeFilter} onChange={setRecordTypeFilter} options={recordTypeOptions} />
                      <Select value={recordExecutorFilter} onChange={setRecordExecutorFilter} options={recordExecutorOptions} />
                      <Select value={recordTimeFilter} onChange={setRecordTimeFilter} options={recordTimeOptions} />
                      <Select value={recordStatusFilter} onChange={setRecordStatusFilter} options={recordStatusOptions} />
                    </div>
                    <div className="spacer-sm" />
                    {filteredServiceLedgerRows.length ? (
                      <Table
                        columns={['记录编号', '企业名称', '服务类型', '来源任务', '执行人', '执行时间', '结果摘要', '证据数量', '状态', '操作']}
                        rows={filteredServiceLedgerRows}
                        renderRow={item => (
                          <tr key={item.recordId} className={cn('clickable-row', selectedRecordId === item.recordId && 'row-active')} onClick={() => openRecordDetail(item.recordId)}>
                            <td>{item.recordId}</td>
                            <td className="wrap-cell">{item.enterpriseName}</td>
                            <td>{item.serviceType}</td>
                            <td className="wrap-cell">{item.sourceTaskName}</td>
                            <td>{item.executor}</td>
                            <td>{item.executedAt}</td>
                            <td className="wrap-cell">{item.resultSummary}</td>
                            <td>{item.evidenceCount}</td>
                            <td><Badge tone={item.recordStatus === '证据完整' ? 'emerald' : item.recordStatus === '待补证据' ? 'amber' : 'red'}>{item.recordStatus}</Badge></td>
                            <td><button className="btn btn-xs btn-dark" onClick={event => { event.stopPropagation(); openRecordDetail(item.recordId) }}>查看详情</button></td>
                          </tr>
                        )}
                      />
                    ) : (
                      <div className="empty-state">当前筛选条件下没有服务记录，请调整筛选后重试。</div>
                    )}
                  </Card>

                  <Card title="服务类型分布区" extra={<Badge tone="violet">按记录沉淀情况统计</Badge>}>
                    <div className="distribution-grid">
                      {serviceTypeDistribution.map(item => (
                        <div key={item.type} className="mini-card">
                          <div className="muted">{item.type}</div>
                          <div className="title-sm">{item.count} 条</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="stack-lg">
                  <Card title="交付沉淀区" extra={<Badge tone="amber">面向月度交付与追溯</Badge>}>
                    <div className="delivery-grid">
                      <div className="mini-card">
                        <div className="muted">可用于月度交付的记录数</div>
                        <div className="title-sm">{deliveryLedger.deliverableCount} 条</div>
                      </div>
                      <div className="mini-card">
                        <div className="muted">缺证据记录数</div>
                        <div className="title-sm">{deliveryLedger.missingEvidenceCount} 条</div>
                      </div>
                      <div className="mini-card">
                        <div className="muted">待补全记录数</div>
                        <div className="title-sm">{deliveryLedger.pendingCompletionCount} 条</div>
                      </div>
                    </div>
                  </Card>

                  <Card title="明细详情区" extra={selectedRecord ? <Badge tone={selectedRecord.recordStatus === '证据完整' ? 'emerald' : selectedRecord.recordStatus === '待补证据' ? 'amber' : 'red'}>{selectedRecord.recordStatus}</Badge> : <Badge tone="slate">请选择服务记录</Badge>}>
                    {selectedRecord ? (
                      <div className="stack-lg">
                        <div className="summary-grid">
                          <div className="mini-card"><div className="muted">企业名称</div><div className="title-sm">{selectedRecord.enterpriseName}</div></div>
                          <div className="mini-card"><div className="muted">服务类型</div><div className="title-sm">{selectedRecord.serviceType}</div></div>
                          <div className="mini-card"><div className="muted">执行人</div><div className="title-sm">{selectedRecord.executor}</div></div>
                          <div className="mini-card"><div className="muted">执行时间</div><div className="title-sm">{selectedRecord.executedAt}</div></div>
                        </div>

                        <div className="surface-outline">
                          <div className="section-subtitle">执行说明</div>
                          <div className="body mt-8">{selectedRecord.resultSummary}</div>
                          <div className="body">备注记录：{selectedRecord.remark}</div>
                        </div>

                        <div className="surface-outline">
                          <div className="section-subtitle">图片 / 附件证据</div>
                          <div className="task-evidence-grid">
                            {selectedRecord.evidenceFiles.map(item => (
                              <div key={item.id} className="task-evidence-card">
                                {item.previewUrl ? <img className="task-evidence-image" src={item.previewUrl} alt={item.title} /> : <div className="task-evidence-preview">服务证据</div>}
                                <div className="stack-sm">
                                  <div className="title-sm">{item.title}</div>
                                  <div className="small muted">{item.time}</div>
                                  <div className="body">{item.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="surface-outline">
                          <div className="section-subtitle">关联关系</div>
                          <div className="todo-list">
                            <div className="todo-item">关联任务：{selectedRecord.sourceTaskName}</div>
                            <div className="todo-item">关联隐患：{selectedRecord.relatedHazardId ? '已关联隐患闭环' : '当前未关联隐患'}</div>
                            <div className="todo-item">关联快照：{selectedRecord.relatedSnapshotId ? '已纳入月度快照' : '待纳入月度快照'}</div>
                          </div>
                        </div>

                        <div className="button-row">
                          <button className="btn btn-dark" onClick={() => openHazardSourceTask(selectedRecord.sourceTaskId, selectedRecord.enterpriseId)}>查看任务详情</button>
                          <button className="btn btn-light" onClick={() => openSnapshotEnterprise(selectedRecord.enterpriseId, selectedMonth)}>查看企业画像</button>
                          {selectedRecord.relatedHazardId && <button className="btn btn-light" onClick={() => navigateToRoute({ page: 'hazards', enterpriseId: selectedRecord.enterpriseId, hazardEnterpriseId: selectedRecord.enterpriseId, selectedHazardId: selectedRecord.relatedHazardId, hazardListScope: 'all' })}>查看隐患闭环</button>}
                          {selectedRecord.relatedSnapshotId && <button className="btn btn-light" onClick={() => navigateToRoute({ page: 'scoreDetail', selectedMonth, snapshotEnterpriseFilter: selectedRecord.enterpriseId, selectedSnapshotId: selectedRecord.relatedSnapshotId })}>查看月度快照</button>}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">请先从左侧选择一条服务记录，查看证据承接和关联任务、隐患、快照。</div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          )}

          {page === 'tasks' && (
            <div className="stack-lg">
              <div className="section-head">
                <div>
                  <div className="section-title">任务中心</div>
                  <div className="page-subtitle">{taskScopeDescription}</div>
                </div>
                <div className="inline-row">
                  <Badge tone="violet">{taskRowsForPage.length} 项</Badge>
                  <button className="btn btn-xs btn-light" onClick={() => openTaskCenter('all')}>查看全部任务</button>
                </div>
              </div>

              <div className="task-status-grid">
                {taskStatusSummary.map(item => (
                  <button
                    key={item.status}
                    className={cn('task-status-card', taskStatusFilter === item.status && 'task-status-card-active')}
                    onClick={() => {
                      setTaskStatusFilter(prev => (prev === item.status ? 'all' : item.status))
                      setTaskQuickFilter('all')
                    }}
                  >
                    <div className="task-status-card-head">
                      <TaskStatusBadge value={item.status} />
                      <span className="task-status-count">{item.count}</span>
                    </div>
                    <div className="small muted">点击聚焦该状态任务</div>
                  </button>
                ))}
              </div>

              <Card
                title="顶部筛选区"
                extra={
                  <div className="task-quick-filters">
                    {(Object.keys(taskQuickFilterLabels) as TaskQuickFilter[]).filter(item => item !== 'all').map(item => (
                      <button
                        key={item}
                        className={cn('task-quick-chip', taskQuickFilter === item && 'task-quick-chip-active')}
                        onClick={() => setTaskQuickFilter(prev => (prev === item ? 'all' : item))}
                      >
                        {taskQuickFilterLabels[item]}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="task-filter-grid">
                  <Select value={taskEnterpriseFilter} onChange={setTaskEnterpriseFilter} options={[{ value: 'all', label: '全部企业' }, ...entOptions]} />
                  <Select value={taskTypeFilter} onChange={setTaskTypeFilter} options={taskTypeOptions} />
                  <Select value={taskStatusFilter} onChange={value => setTaskStatusFilter(value as 'all' | UnifiedTaskStatus)} options={taskStatusFilterOptions} />
                  <Select value={taskPriorityFilter} onChange={value => setTaskPriorityFilter(value as 'all' | TaskPriority)} options={priorityOptions} />
                  <Select value={taskTimeFilter} onChange={value => setTaskTimeFilter(value as TaskTimeFilter)} options={taskTimeOptions} />
                  <Select value={taskAssigneeFilter} onChange={setTaskAssigneeFilter} options={taskAssigneeOptions} />
                </div>
              </Card>

              <Card title="任务列表区" extra={<Badge tone="blue">{taskRowsForPage.length} 条任务</Badge>}>
                {taskRowsForPage.length ? (
                  <Table
                    className="task-table"
                    columns={['任务编号', '任务名称', '企业名称', '任务类型', '来源', '派发时间', '截止时间', '执行人', '当前状态', '优先级', '操作']}
                    rows={taskRowsForPage}
                    renderRow={(item: TaskCenterItem) => (
                      <tr key={item.taskId} className={cn('clickable-row', selectedTaskId === item.taskId && 'row-active')} onClick={() => setSelectedTaskId(item.taskId)}>
                        <td>{item.taskCode}</td>
                        <td className="cell strong wrap-cell">{item.taskName}</td>
                        <td className="wrap-cell">{item.enterpriseName}</td>
                        <td>{item.taskType}</td>
                        <td>{item.source}</td>
                        <td>{item.assignTime}</td>
                        <td>{item.dueTime}</td>
                        <td>{item.assignee}</td>
                        <td><TaskStatusBadge value={item.status} /></td>
                        <td><PriorityBadge value={item.priority} /></td>
                        <td>
                          <button
                            className="btn btn-xs btn-dark"
                            onClick={event => {
                              event.stopPropagation()
                              setSelectedTaskId(item.taskId)
                            }}
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    )}
                  />
                ) : (
                  <div className="empty-state">当前筛选条件下没有任务，请调整筛选后重试。</div>
                )}
              </Card>
            </div>
          )}

          {page === 'users' && <div className="stack-lg"><div className="two-col">{(['企业', '安全服务商', '保险平台', '应急局'] as Perspective[]).map(group => <Card key={group} title={`${group}角色成员`} extra={<PerspectiveBadge value={group} />}><Table columns={['姓名', '所属单位', '岗位', '数据范围', '状态', '最近登录']} rows={users.filter(item => item.group === group)} renderRow={(item: UserItem) => <tr key={item.id}><td className="cell strong">{item.name}</td><td>{item.org}</td><td>{item.role}</td><td>{item.scope}</td><td><StatusBadge value={item.status} /></td><td>{item.lastLogin}</td></tr>} /></Card>)}</div><Card title="数据分层可见规则" extra={<Badge tone="cyan">默认可见范围</Badge>}><Table columns={['角色', '可见内容', '默认不可见']} rows={privacyRules} renderRow={item => <tr key={item.audience}><td className="cell strong">{item.audience}</td><td className="wrap-cell">{item.visible}</td><td className="wrap-cell">{item.hidden}</td></tr>} /></Card></div>}

          {page === 'bigscreen' && <Card title="演示总览" extra={<Badge tone="amber">本次不扩展大屏</Badge>}><div className="body">本轮只做评分试用版能力，没有新增复杂大屏；保留该入口仅用于说明本次边界。</div></Card>}
        </div>
      </div>

      {page === 'detail' && detailSnapshotMonth && activePortraitSnapshot && (
        <>
          <div className="drawer-mask" onClick={() => setDetailSnapshotMonth(null)} />
          <aside className="drawer-panel portrait-snapshot-drawer">
            <div className="drawer-head">
              <div>
                <div className="page-title" style={{ fontSize: 22 }}>月度快照详情</div>
                <div className="page-subtitle">{selectedEnterprise.name} · {activePortraitSnapshot.month}</div>
              </div>
              <button className="btn btn-light" onClick={() => setDetailSnapshotMonth(null)}>关闭</button>
            </div>
            <div className="stack-lg">
              <div className="summary-grid">
                <div className="mini-card">
                  <div className="muted">该月得分</div>
                  <div className="title-sm">{activePortraitSnapshot.score}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">风险等级</div>
                  <div className="title-sm">{activePortraitSnapshot.riskLevel}风险</div>
                </div>
                <div className="mini-card">
                  <div className="muted">闭环率</div>
                  <div className="title-sm">{activePortraitSnapshot.closedRate}%</div>
                </div>
                <div className="mini-card">
                  <div className="muted">未闭环隐患</div>
                  <div className="title-sm">{activePortraitSnapshot.openHazardCount} 项</div>
                </div>
              </div>

              <div className="surface-outline">
                <div className="list-card-head">
                  <div className="section-subtitle">关键备注</div>
                  <div className="inline-row">
                    <Badge tone={activePortraitSnapshot.levelColor}>{activePortraitSnapshot.levelName}</Badge>
                    <RiskBadge level={activePortraitSnapshot.riskLevel} />
                  </div>
                </div>
                <div className="body mt-8">{activePortraitSnapshot.note}</div>
                <div className="body">主要隐患变化：{activePortraitSnapshot.hazardChange}</div>
                <div className="body">主要服务动作：{activePortraitSnapshot.serviceSummary}</div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">主要服务动作</div>
                <div className="task-timeline">
                  {activePortraitSnapshot.keyActions.map((item, index) => (
                    <div key={`${activePortraitSnapshot.month}-${index}`} className="task-timeline-item">
                      <div className="task-timeline-dot" />
                      <div className="task-timeline-body">
                        <div className="body">{item}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">主要隐患变化</div>
                <div className="summary-grid">
                  <div className="mini-card">
                    <div className="muted">未闭环隐患数</div>
                    <div className="title-sm">{activePortraitSnapshot.openHazardCount} 项</div>
                  </div>
                  <div className="mini-card">
                    <div className="muted">超期整改数</div>
                    <div className="title-sm">{activePortraitSnapshot.overdueHazardCount} 项</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {visibleHazardDetail && selectedHazard && (
        <>
          <div className="drawer-mask" onClick={() => setSelectedHazardId('')} />
          <aside className="drawer-panel task-detail-drawer">
            <div className="drawer-head">
              <div>
                <div className="page-title" style={{ fontSize: 22 }}>隐患详情</div>
                <div className="page-subtitle">{selectedHazard.hazardCode} · {selectedHazard.enterpriseName}</div>
              </div>
              <button className="btn btn-light" onClick={() => setSelectedHazardId('')}>关闭</button>
            </div>

            <div className="stack-lg">
              <div className="surface-outline task-detail-header">
                <div className="stack-sm">
                  <div className="title-sm">{selectedHazard.hazardName}</div>
                  <div className="small muted">{selectedHazard.hazardDescription}</div>
                </div>
                <div className="inline-row">
                  <RiskBadge level={selectedHazard.hazardLevel} />
                  <StatusBadge value={selectedHazard.status} />
                </div>
              </div>

              <div className="summary-grid">
                <div className="mini-card"><div className="muted">发现来源</div><div className="title-sm">{selectedHazard.sourceTaskName}</div></div>
                <div className="mini-card"><div className="muted">整改责任人</div><div className="title-sm">{selectedHazard.responsiblePerson}</div></div>
                <div className="mini-card"><div className="muted">整改期限</div><div className="title-sm">{selectedHazard.rectificationDeadline}</div></div>
                <div className="mini-card"><div className="muted">复查状态</div><div className="title-sm">{selectedHazard.reviewStatus}</div></div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">现场图片 / 证据</div>
                <div className="task-evidence-grid">
                  {selectedHazard.evidenceFiles.map(item => (
                    <div key={item.id} className="task-evidence-card">
                      <div className="task-evidence-preview">{item.category}</div>
                      <div className="stack-sm">
                        <div className="title-sm">{item.title}</div>
                        <div className="small muted">{item.time}</div>
                        <div className="body">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">整改要求</div>
                <div className="body mt-8">请围绕“{selectedHazard.hazardName}”完成现场整改、责任确认、整改前后对比留痕，并在 {selectedHazard.rectificationDeadline} 前提交证明材料。</div>
                <div className="body">当前整改状态：{selectedHazard.rectificationStatus}</div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">整改提交记录</div>
                <div className="task-timeline">
                  {selectedHazard.rectificationRecords.map(item => (
                    <div key={item.id} className="task-timeline-item">
                      <div className="task-timeline-dot" />
                      <div className="task-timeline-body">
                        <div className="list-card-head">
                          <div>
                            <div className="title-sm">{item.action}</div>
                            <div className="small muted">{item.actor}</div>
                          </div>
                          <div className="small muted">{item.time}</div>
                        </div>
                        <div className="body mt-8">{item.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">复查记录</div>
                <div className="task-timeline">
                  {selectedHazard.reviewRecords.length ? selectedHazard.reviewRecords.map(item => (
                    <div key={item.id} className="task-timeline-item">
                      <div className="task-timeline-dot" />
                      <div className="task-timeline-body">
                        <div className="list-card-head">
                          <div>
                            <div className="title-sm">{item.action}</div>
                            <div className="small muted">{item.actor}</div>
                          </div>
                          <div className="small muted">{item.time}</div>
                        </div>
                        <div className="body mt-8">{item.note}</div>
                      </div>
                    </div>
                  )) : <div className="empty-state">当前隐患尚未进入复查阶段。</div>}
                </div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">闭环时间线</div>
                <div className="task-timeline">
                  {selectedHazard.timeline.map(item => (
                    <details key={item.id} className="timeline-expander" open>
                      <summary className="timeline-summary">
                        <div className="inline-row">
                          <Badge tone={item.tone}>{item.title}</Badge>
                          <span className="small muted">{item.time}</span>
                        </div>
                        <span className="small muted">查看证据</span>
                      </summary>
                      <div className="timeline-details">
                        <div className="body">{item.note}</div>
                        {item.evidences.length > 0 && (
                          <div className="task-evidence-grid">
                            {item.evidences.map(evidence => (
                              <div key={evidence.id} className="task-evidence-card">
                                <div className="task-evidence-preview">{evidence.category}</div>
                                <div className="stack-sm">
                                  <div className="title-sm">{evidence.title}</div>
                                  <div className="small muted">{evidence.time}</div>
                                  <div className="body">{evidence.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">关闭结论</div>
                <div className="body mt-8">{selectedHazard.status === '已闭环' ? '复查确认通过，已形成闭环归档结论。' : selectedHazard.status === '待复查' ? '整改材料已齐套，待复查确认后归档。' : '当前仍处于整改推进阶段，暂未形成关闭结论。'}</div>
              </div>

              <div className="button-row">
                <button className="btn btn-dark" onClick={() => openHazardEnterprise(selectedHazard.enterpriseId)}>查看企业画像</button>
                {selectedHazard.sourceTaskId && <button className="btn btn-light" onClick={() => openHazardSourceTask(selectedHazard.sourceTaskId, selectedHazard.enterpriseId)}>查看来源任务</button>}
              </div>
            </div>
          </aside>
        </>
      )}

      {visibleTaskDetail && selectedTask && (
        <>
          <div className="drawer-mask" onClick={() => setSelectedTaskId('')} />
          <aside className="drawer-panel task-detail-drawer">
            <div className="drawer-head">
              <div>
                <div className="page-title" style={{ fontSize: 22 }}>任务详情</div>
                <div className="page-subtitle">{selectedTask.taskCode} · {selectedTask.enterpriseName}</div>
              </div>
              <button className="btn btn-light" onClick={() => setSelectedTaskId('')}>关闭</button>
            </div>

            <div className="stack-lg">
              <div className="surface-outline task-detail-header">
                <div className="stack-sm">
                  <div className="title-sm">{selectedTask.taskName}</div>
                  <div className="small muted">{selectedTask.taskDescription}</div>
                </div>
                <div className="inline-row">
                  <TaskStatusBadge value={selectedTask.status} />
                  <PriorityBadge value={selectedTask.priority} />
                </div>
              </div>

              <div className="summary-grid">
                <div className="mini-card">
                  <div className="muted">任务类型</div>
                  <div className="title-sm">{selectedTask.taskType}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">来源</div>
                  <div className="title-sm">{selectedTask.source}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">派发时间</div>
                  <div className="title-sm">{selectedTask.assignTime}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">截止时间</div>
                  <div className="title-sm">{selectedTask.dueTime}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">执行人</div>
                  <div className="title-sm">{selectedTask.assignee}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">当前进度</div>
                  <div className="title-sm">{selectedTask.progressPercent}%</div>
                </div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">当前进度</div>
                <div className="body mt-8">{selectedTask.currentProgress}</div>
                <div className="spacer-sm" />
                <div className="progress-track">
                  <div className={cn('progress-bar', selectedTask.status === '已闭环' ? 'progress-emerald' : selectedTask.status === '已超期' ? 'progress-red' : 'progress-blue')} style={{ width: `${selectedTask.progressPercent}%` }} />
                </div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">任务说明</div>
                <div className="body mt-8">{selectedTask.taskDescription}</div>
                <div className="body">最近动作：{selectedTask.latestAction}</div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">关联企业</div>
                <div className="body mt-8">{selectedTask.enterpriseName}</div>
                <div className="small muted">点击下方按钮可查看企业画像，返回后会回到当前任务中心状态。</div>
              </div>

              <div className="surface-outline">
                <div className="section-subtitle">执行记录</div>
                <div className="task-timeline">
                  {selectedTask.executionRecords.map(item => (
                    <div key={item.id} className="task-timeline-item">
                      <div className="task-timeline-dot" />
                      <div className="task-timeline-body">
                        <div className="list-card-head">
                          <div>
                            <div className="title-sm">{item.action}</div>
                            <div className="small muted">{item.actor}</div>
                          </div>
                          <div className="small muted">{item.time}</div>
                        </div>
                        <div className="body mt-8">{item.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-outline">
                <div className="task-evidence-head">
                  <div className="section-subtitle">现场图片 / 证据</div>
                  <div className="inline-row">
                    <input ref={evidenceInputRef} className="hidden-file-input" type="file" accept="image/*" multiple onChange={handleTaskEvidenceUpload} />
                    <button className="btn btn-xs btn-dark" onClick={openEvidencePicker}>上传现场图片</button>
                    <button className="btn btn-xs btn-light" onClick={openEvidencePicker}>重新上传</button>
                  </div>
                </div>
                {selectedTaskUploads.length > 0 && <div className="small muted">当前任务已补录 {selectedTaskUploads.length} 张现场图片，关闭抽屉后再次打开仍可继续查看。</div>}
                <div className="task-evidence-grid">
                  {selectedTask.evidenceFiles.map(item => (
                    <div key={item.id} className="task-evidence-card">
                      <div className="task-evidence-preview">{item.category}</div>
                      <div className="stack-sm">
                        <div className="title-sm">{item.title}</div>
                        <div className="small muted">{item.time}</div>
                        <div className="body">{item.description}</div>
                      </div>
                    </div>
                  ))}
                  {selectedTaskUploads.map(item => (
                    <div key={item.id} className="task-evidence-card">
                      <img className="task-evidence-image" src={item.previewUrl} alt={item.title} />
                      <div className="stack-sm">
                        <div className="list-card-head">
                          <div>
                            <div className="title-sm">{item.title}</div>
                            <div className="small muted">{item.time}</div>
                          </div>
                          <Badge tone="emerald">已补录</Badge>
                        </div>
                        <div className="body">{item.description}</div>
                        <div className="button-row">
                          <button className="btn btn-xs btn-light" onClick={openEvidencePicker}>重传</button>
                          <button className="btn btn-xs btn-light" onClick={() => removeTaskEvidence(selectedTask.taskId, item.id)}>删除</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="summary-grid">
                <div className="mini-card">
                  <div className="muted">是否发现隐患</div>
                  <div className="title-sm">{selectedTask.hazardFound ? '是' : '否'}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">隐患数量</div>
                  <div className="title-sm">{selectedTask.hazardCount} 项</div>
                </div>
                <div className="mini-card">
                  <div className="muted">后续整改状态</div>
                  <div className="title-sm">{selectedTask.rectificationStatus}</div>
                </div>
                <div className="mini-card">
                  <div className="muted">复查状态</div>
                  <div className="title-sm">{selectedTask.reviewStatus}</div>
                </div>
              </div>

              <div className="button-row">
                <button className="btn btn-dark" onClick={() => openTaskEnterpriseDetail(selectedTask)}>查看企业画像</button>
                {selectedTask.hazardFound && <button className="btn btn-light" onClick={() => openTaskHazards(selectedTask)}>查看隐患闭环</button>}
              </div>
            </div>
          </aside>
        </>
      )}

      {drawerSnapshot && <><div className="drawer-mask" onClick={() => setDrawer(null)} /><aside className="drawer-panel"><div className="drawer-head"><div><div className="page-title" style={{ fontSize: 22 }}>扣分明细抽屉</div><div className="page-subtitle">{drawerSnapshot.enterpriseName} · {drawerSnapshot.month} · 历史不可覆盖</div></div><button className="btn btn-light" onClick={() => setDrawer(null)}>关闭</button></div><div className="stack-lg">{detailRows.map(item => <div key={item.id} className="surface-outline"><div className="list-card-head"><div><div className="title-sm">{item.ruleName}</div><div className="small muted">{item.dimensionName} · {item.metricCode}</div></div><Badge tone={item.deducted > 0 ? 'red' : 'emerald'}>{item.score}/{item.maxScore}</Badge></div><div className="spacer-sm" /><div className="body">实际值：{item.actualValue}</div><div className="body">扣分说明：{item.reason}</div><div className="small muted">来源字段：{item.dataSourceField}</div><div className="small muted">来源表：{item.sourceTable}</div><div className="small muted">API 字段：{item.sourceApiField}</div></div>)}</div></aside></>}
    </div>
  )
}

export default App
