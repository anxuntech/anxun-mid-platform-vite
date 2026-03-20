import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
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

type Perspective = '企业' | '安全服务商' | '保险平台' | '应急局'
type PageKey = 'dashboard' | 'enterprises' | 'detail' | 'scoreDetail' | 'scoreTrend' | 'scoreConfig' | 'hazards' | 'devices' | 'tasks' | 'users' | 'bigscreen'
type Level = 'A' | 'B' | 'C' | 'D'
type Risk = '高' | '中' | '低'
type HazardStatus = '待整改' | '整改中' | '待复查' | '已闭环'
type DeviceStatus = '在线' | '离线' | '告警'
type TaskStage = '待指派' | '待接单' | '执行中' | '待验收' | '已完成'
type TaskPriority = '高' | '中' | '低'
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
  __app?: 'safe-platform'
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
  { key: 'detail' as PageKey, label: '企业详情', icon: Factory },
  { key: 'scoreDetail' as PageKey, label: '企业评分详情', icon: Calculator },
  { key: 'scoreTrend' as PageKey, label: '评分趋势', icon: LineChart },
  { key: 'scoreConfig' as PageKey, label: '评分机制配置', icon: Settings2 },
  { key: 'hazards' as PageKey, label: '隐患闭环', icon: FileWarning },
  { key: 'devices' as PageKey, label: '设备物联', icon: Radio },
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
const historyMarker = 'safe-platform'
const defaultEnterpriseId = 'ent-002'
const taskStatusOrder: UnifiedTaskStatus[] = ['待执行', '执行中', '已发现隐患', '待整改', '待复查', '已闭环', '已超期']
const taskStatusTone: Record<UnifiedTaskStatus, Tone> = { 待执行: 'slate', 执行中: 'blue', 已发现隐患: 'amber', 待整改: 'amber', 待复查: 'violet', 已闭环: 'emerald', 已超期: 'red' }
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

const buildRouteUrl = (route: AppRouteState) => {
  const params = new URLSearchParams()
  params.set('app', historyMarker)
  params.set('page', route.page)
  if (route.enterpriseId) params.set('enterpriseId', route.enterpriseId)
  if (route.taskId) params.set('taskId', route.taskId)
  if (route.taskListScope) params.set('taskListScope', route.taskListScope)
  if (route.hazardListScope) params.set('hazardListScope', route.hazardListScope)
  if (route.hazardEnterpriseId) params.set('hazardEnterpriseId', route.hazardEnterpriseId)
  if (route.taskEnterpriseFilter && route.taskEnterpriseFilter !== 'all') params.set('taskEnterpriseFilter', route.taskEnterpriseFilter)
  if (route.taskTypeFilter && route.taskTypeFilter !== 'all') params.set('taskTypeFilter', route.taskTypeFilter)
  if (route.taskStatusFilter && route.taskStatusFilter !== 'all') params.set('taskStatusFilter', route.taskStatusFilter)
  if (route.taskPriorityFilter && route.taskPriorityFilter !== 'all') params.set('taskPriorityFilter', route.taskPriorityFilter)
  if (route.taskTimeFilter && route.taskTimeFilter !== 'all') params.set('taskTimeFilter', route.taskTimeFilter)
  if (route.taskAssigneeFilter && route.taskAssigneeFilter !== 'all') params.set('taskAssigneeFilter', route.taskAssigneeFilter)
  if (route.taskQuickFilter && route.taskQuickFilter !== 'all') params.set('taskQuickFilter', route.taskQuickFilter)
  const query = params.toString()
  return query ? `${window.location.pathname}?${query}` : window.location.pathname
}

const readRouteStateFromUrl = (): AppRouteState | null => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('app') !== historyMarker) return null
  const page = params.get('page') as PageKey | null
  if (!page) return null
  return {
    __app: historyMarker,
    page,
    enterpriseId: params.get('enterpriseId') || undefined,
    taskId: params.get('taskId') || undefined,
    taskListScope: (params.get('taskListScope') as TaskListScope | null) || undefined,
    hazardListScope: (params.get('hazardListScope') as HazardListScope | null) || undefined,
    hazardEnterpriseId: params.get('hazardEnterpriseId') || undefined,
    taskEnterpriseFilter: params.get('taskEnterpriseFilter') || undefined,
    taskTypeFilter: params.get('taskTypeFilter') || undefined,
    taskStatusFilter: (params.get('taskStatusFilter') as UnifiedTaskStatus | 'all' | null) || undefined,
    taskPriorityFilter: (params.get('taskPriorityFilter') as TaskPriority | 'all' | null) || undefined,
    taskTimeFilter: (params.get('taskTimeFilter') as TaskTimeFilter | null) || undefined,
    taskAssigneeFilter: params.get('taskAssigneeFilter') || undefined,
    taskQuickFilter: (params.get('taskQuickFilter') as TaskQuickFilter | null) || undefined,
  }
}

const isAppRouteState = (value: unknown): value is AppRouteState => Boolean(value) && typeof value === 'object' && (value as AppRouteState).__app === historyMarker

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
  const [dashboardEnterpriseFilter, setDashboardEnterpriseFilter] = useState('all')
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState('all')
  const [dashboardPriorityFilter, setDashboardPriorityFilter] = useState<'all' | TaskPriority>('all')
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

  const applyRouteState = (route: AppRouteState) => {
    setPage(route.page)
    setSelectedEnterpriseId(route.enterpriseId || defaultEnterpriseId)
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
  }

  const pushRouteState = (route: AppRouteState) => {
    const nextRoute = { ...route, __app: historyMarker }
    window.history.pushState(nextRoute, '', buildRouteUrl(nextRoute))
    applyRouteState(nextRoute)
  }

  useEffect(() => {
    const initialRoute = readRouteStateFromUrl() || { __app: historyMarker, page: 'dashboard' as PageKey }
    window.history.replaceState(initialRoute, '', buildRouteUrl(initialRoute))
    applyRouteState(initialRoute)

    const handlePopState = (event: PopStateEvent) => {
      const nextRoute = isAppRouteState(event.state) ? event.state : readRouteStateFromUrl() || { __app: historyMarker, page: 'dashboard' as PageKey }
      applyRouteState(nextRoute)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
    const routeState = { ...nextRoute, __app: historyMarker }
    window.history.replaceState(routeState, '', buildRouteUrl(routeState))
  }, [page, selectedTaskId, taskListScope, taskEnterpriseFilter, taskTypeFilter, taskStatusFilter, taskPriorityFilter, taskTimeFilter, taskAssigneeFilter, taskQuickFilter])

  const openTaskCenter = (scope: TaskListScope, taskId?: string, pushHistory = false) => {
    const scopedRows = taskCenterRows.filter(item => {
      if (scope === 'today') return item.status !== '已闭环' && item.dueTime <= dashboardToday
      if (scope === 'weekCompleted') return item.status === '已闭环' && item.dueTime >= weekStart && item.dueTime <= dashboardToday
      if (scope === 'monthly') return item.dueTime.startsWith(dashboardMonth) || item.assignTime.startsWith(dashboardMonth)
      return true
    })
    const nextTaskId = taskId || scopedRows[0]?.taskId || ''
    if (pushHistory) {
      pushRouteState({ page: 'tasks', taskListScope: scope, taskId: nextTaskId, taskEnterpriseFilter: 'all', taskTypeFilter: 'all', taskStatusFilter: 'all', taskPriorityFilter: 'all', taskTimeFilter: 'all', taskAssigneeFilter: 'all', taskQuickFilter: 'all' })
      return
    }
    setTaskListScope(scope)
    setSelectedTaskId(nextTaskId)
    setPage('tasks')
  }

  const openEnterpriseDetail = (enterpriseId: string, pushHistory = false) => {
    if (pushHistory) {
      pushRouteState({ page: 'detail', enterpriseId })
      return
    }
    setSelectedEnterpriseId(enterpriseId)
    setPage('detail')
  }

  const openTaskEnterpriseDetail = (task: TaskCenterItem) => {
    pushRouteState({ page: 'detail', enterpriseId: task.enterpriseId })
  }

  const openTaskHazards = (task: TaskCenterItem) => {
    pushRouteState({
      page: 'hazards',
      enterpriseId: task.enterpriseId,
      hazardEnterpriseId: task.enterpriseId,
      hazardListScope: task.status === '待复查' ? 'pendingReview' : task.status === '已超期' ? 'overdueOpen' : 'all',
    })
  }

  const overviewCards = [
    { key: 'today', title: '今日待执行任务数', value: `${taskCountToday}项`, desc: '进入任务中心查看今天必须处理的任务清单。', icon: ClipboardCheck, action: () => openTaskCenter('today', undefined, true) },
    { key: 'week', title: '本周已完成任务数', value: `${taskCompletedWeek}项`, desc: '查看本周已交付和待验收任务。', icon: CalendarDays, action: () => openTaskCenter('weekCompleted', undefined, true) },
    { key: 'review', title: '待复查隐患数', value: `${hazardPendingReview}项`, desc: '直达待复查隐患清单，优先安排复核。', icon: FileWarning, action: () => pushRouteState({ page: 'hazards', hazardListScope: 'pendingReview' }) },
    { key: 'overdue', title: '超期未闭环数', value: `${overdueOpenCount}项`, desc: '查看超期未闭环隐患，优先催办闭环。', icon: AlertTriangle, action: () => pushRouteState({ page: 'hazards', hazardListScope: 'overdueOpen' }) },
    { key: 'covered', title: '已覆盖企业数 / 总企业数', value: `${enterpriseCoveredCount}/${enterpriseTotalCount}`, desc: '查看本月已服务企业覆盖情况。', icon: Building2, action: () => pushRouteState({ page: 'enterprises' }) },
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
            return <button key={item.key} onClick={() => setPage(item.key)} className={cn('nav-btn', page === item.key && 'nav-btn-active')}><span className="inline-row"><Icon className="icon-sm" /><span>{item.label}</span></span><ChevronRight className="icon-sm faint" /></button>
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

          {page === 'enterprises' && <Card title={`${perspective}企业列表`} extra={<div className="search-wrap"><Search className="search-icon" /><input className="search-input" value={selectedEnterprise.name} readOnly /></div>}><Table columns={['企业名称', '行业', '区域', '试用版得分', '等级', '高风险隐患', '操作']} rows={enterprises} renderRow={(item: Enterprise) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.industry}</td><td>{item.area}</td><td>{latestMap[item.id].totalScore}</td><td><Badge tone={latestMap[item.id].levelColor}>{latestMap[item.id].levelName}</Badge></td><td>{hazards.filter(h => h.enterpriseId === item.id && h.level === '高' && h.status !== '已闭环').length}</td><td><div className="button-row"><button className="btn btn-xs btn-light" onClick={() => openEnterpriseDetail(item.id)}>详情</button><button className="btn btn-xs btn-dark" onClick={() => { setSelectedEnterpriseId(item.id); setPage('scoreDetail') }}>评分</button></div></td></tr>} /></Card>}

          {page === 'detail' && <div className="stack-lg"><div className="entity-switch">{enterprises.map(item => <button key={item.id} onClick={() => setSelectedEnterpriseId(item.id)} className={cn('entity-chip', item.id === selectedEnterpriseId && 'entity-chip-active')}>{item.name}</button>)}</div><div className="two-col-hero"><Card title="企业基础信息" extra={<div className="inline-row"><PerspectiveBadge value={perspective} /><RiskBadge level={selectedEnterprise.risk} /></div>}><div className="info-grid"><div className="info-field"><div className="field-label with-icon"><Factory className="icon-xs" /> 企业名称</div><div className="field-value">{selectedEnterprise.name}</div></div><div className="info-field"><div className="field-label with-icon"><LayoutGrid className="icon-xs" /> 行业类别</div><div className="field-value">{selectedEnterprise.industry}</div></div><div className="info-field"><div className="field-label with-icon"><MapPinned className="icon-xs" /> 所在区域</div><div className="field-value">{selectedEnterprise.area}</div></div><div className="info-field"><div className="field-label with-icon"><Briefcase className="icon-xs" /> 负责人</div><div className="field-value">{selectedEnterprise.leader}</div></div><div className="info-field span-2"><div className="field-label with-icon"><Users className="icon-xs" /> 联系方式</div><div className="field-value">{selectedEnterprise.phone}</div></div></div></Card><Card title="评分摘要" extra={<Badge tone={latestMap[selectedEnterprise.id].levelColor}>{latestMap[selectedEnterprise.id].levelName}</Badge>}><div className="summary-grid"><div className="mini-card"><div className="muted">最新分数</div><div className="title-sm">{latestMap[selectedEnterprise.id].totalScore}</div></div><div className="mini-card"><div className="muted">快照月份</div><div className="title-sm">{latestMap[selectedEnterprise.id].month}</div></div><div className="mini-card"><div className="muted">高风险隐患</div><div className="title-sm">{hazards.filter(item => item.enterpriseId === selectedEnterprise.id && item.level === '高' && item.status !== '已闭环').length}</div></div><div className="mini-card"><div className="muted">异常设备</div><div className="title-sm">{devices.filter(item => item.enterpriseId === selectedEnterprise.id && item.status !== '在线').length}</div></div></div><div className="spacer-sm" /><div className="button-row"><button className="btn btn-dark" onClick={() => setPage('scoreDetail')}>评分详情</button><button className="btn btn-blue" onClick={() => setPage('scoreTrend')}>评分趋势</button></div></Card></div></div>}

          {page === 'scoreDetail' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">企业评分详情页</div><div className="page-subtitle">支持按企业 + 月份生成评分结果快照，历史快照不可被覆盖。</div></div><div className="button-row"><button className="btn btn-dark" onClick={buildSnapshot}>生成评分快照</button><button className="btn btn-light" onClick={() => setDrawer({ snapshotId: visibleSnapshot.id })}><PanelRightOpen className="icon-sm" />扣分明细</button></div></div><div className="score-toolbar"><div className="score-toolbar-group"><div className="field-label">企业</div><Select value={selectedEnterpriseId} onChange={setSelectedEnterpriseId} options={entOptions} /></div><div className="score-toolbar-group"><div className="field-label">月份</div><Select value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} /></div><div className="score-toolbar-group"><div className="field-label">方案</div><div className="surface-outline"><div className="title-sm">{activeScheme.name}</div><div className="small muted">{activeScheme.version} · {activeScheme.snapshotPolicy}</div></div></div></div><div className="grid-4"><StatCard title="得分" value={visibleSnapshot.totalScore} subtitle={currentSnapshot ? '已锁定快照' : '当前实时试算'} icon={Calculator} /><StatCard title="等级" value={visibleSnapshot.levelName} subtitle="按评分等级区间判定" icon={Sparkles} /><StatCard title="启用规则" value={ruleRows.filter(item => item.enabled).length} subtitle="当前方案规则数" icon={SlidersHorizontal} /><StatCard title="快照状态" value={currentSnapshot ? '已生成' : '未生成'} subtitle={currentSnapshot ? currentSnapshot.generatedAt : '可点击上方按钮生成'} icon={CalendarDays} /></div><div className="two-col"><Card title="维度得分" extra={<Badge tone="cyan">当前月份</Badge>}><Table columns={['维度', '得分', '满分', '扣减', '操作']} rows={visibleSnapshot.dimensionScores} renderRow={(item: DimensionScore) => <tr key={item.dimensionId}><td className="cell strong">{item.dimensionName}</td><td>{item.score}</td><td>{item.fullScore}</td><td>{item.deductions}</td><td><button className="btn btn-xs btn-light" onClick={() => setDrawer({ snapshotId: visibleSnapshot.id, dimensionId: item.dimensionId })}>扣分明细</button></td></tr>} /></Card><Card title="来源指标试算" extra={<Badge tone="violet">真实接口字段已预留</Badge>}><div className="stack">{Object.entries(visibleSnapshot.metrics).map(([key, value]) => <div key={key} className="surface-outline"><div className="list-card-head"><div className="title-sm">{key}</div><Badge tone="blue">{String(value)}</Badge></div></div>)}</div></Card></div><Card title="规则映射清单" extra={<Badge tone="amber">每条规则字段齐全</Badge>}><Table columns={['规则名称', '指标编码', '所属维度', '数据来源字段', '统计周期', '计算方式', '分值上限', '启用状态', '适用企业类型']} rows={ruleRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreRule) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.metricCode}</td><td>{dimensionRows.find(dimension => dimension.id === item.dimensionId)?.name || '-'}</td><td className="wrap-cell">{item.dataSourceField}</td><td>{item.statPeriod}</td><td>{item.calcMethod}</td><td>{item.maxScore}</td><td>{item.enabled ? <Badge tone="emerald">启用</Badge> : <Badge tone="slate">停用</Badge>}</td><td className="wrap-cell">{item.enterpriseTypes.join(' / ')}</td></tr>} /></Card></div>}

          {page === 'scoreTrend' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">评分趋势页</div><div className="page-subtitle">按企业查看历史快照，不做覆盖，只追加新月份。</div></div><button className="btn btn-dark" onClick={buildSnapshot}>生成当前月份快照</button></div><div className="score-toolbar"><div className="score-toolbar-group"><div className="field-label">企业</div><Select value={selectedEnterpriseId} onChange={setSelectedEnterpriseId} options={entOptions} /></div><div className="score-toolbar-group"><div className="field-label">说明</div><div className="surface-outline"><div className="title-sm">{selectedEnterprise.name}</div><div className="small muted">已保存 {trendRows.length} 条评分历史</div></div></div></div><Card title="月度趋势" extra={<Badge tone="cyan">历史快照不覆盖</Badge>}><div className="stack">{trendRows.map(item => <div key={item.id} className="surface-outline"><div className="list-card-head"><div><div className="title-sm">{item.month}</div><div className="small muted">{item.generatedAt}</div></div><div className="inline-row"><Badge tone={item.levelColor}>{item.levelName}</Badge><div className="title-sm">{item.totalScore}</div></div></div><div className="spacer-sm" /><div className="progress-track"><div className="progress-bar progress-blue" style={{ width: `${item.totalScore}%` }} /></div><div className="score-trend-grid">{item.dimensionScores.map(dimension => <div key={dimension.dimensionId} className="mini-card"><div className="muted">{dimension.dimensionName}</div><div className="title-sm">{dimension.score}/{dimension.fullScore}</div></div>)}</div></div>)}</div></Card></div>}

          {page === 'scoreConfig' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">评分机制配置页</div><div className="page-subtitle">支持评分方案、维度、规则、等级区间的试用态配置。</div></div><button className="btn btn-dark" onClick={() => setMessage('评分配置已保存在前端试用态')}>保存配置</button></div><Card title="评分方案" extra={<Badge tone="violet">试用版</Badge>}><Table columns={['方案名称', '版本', '状态', '生效时间', '快照策略', '描述', '操作']} rows={schemeRows} renderRow={(item: ScoreScheme) => <tr key={item.id}><td className="cell strong">{item.name}</td><td>{item.version}</td><td><StatusBadge value={item.status} /></td><td>{item.effectiveFrom}</td><td>{item.snapshotPolicy}</td><td className="wrap-cell">{item.description}</td><td><button className="btn btn-xs btn-light" onClick={() => { setSchemeRows(prev => prev.map(row => ({ ...row, status: row.id === item.id ? '启用' : '草稿' }))); setMessage(`已切换启用方案：${item.name}`) }}>设为启用</button></td></tr>} /></Card><div className="two-col"><Card title="评分维度" extra={<Badge tone="cyan">当前方案</Badge>}><Table columns={['维度编码', '维度名称', '权重', '排序', '说明']} rows={dimensionRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreDimension) => <tr key={item.id}><td>{item.code}</td><td className="cell strong">{item.name}</td><td><input className="inline-input" type="number" value={item.weight} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, weight: Number(event.target.value) } : row))} /></td><td><input className="inline-input" type="number" value={item.order} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, order: Number(event.target.value) } : row))} /></td><td className="wrap-cell"><input className="inline-input" value={item.note} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, note: event.target.value } : row))} /></td></tr>} /></Card><Card title="评分等级区间" extra={<Badge tone="amber">快照按生成时锁定</Badge>}><Table columns={['等级', '最小值', '最大值', '颜色', '说明']} rows={levelRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreLevelRange) => <tr key={item.id}><td className="cell strong">{item.name}</td><td><input className="inline-input" type="number" value={item.min} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, min: Number(event.target.value) } : row))} /></td><td><input className="inline-input" type="number" value={item.max} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, max: Number(event.target.value) } : row))} /></td><td><select value={item.color} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, color: event.target.value as Tone } : row))}>{(['emerald', 'blue', 'amber', 'red'] as Tone[]).map(tone => <option key={tone} value={tone}>{tone}</option>)}</select></td><td className="wrap-cell"><input className="inline-input" value={item.description} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, description: event.target.value } : row))} /></td></tr>} /></Card></div><Card title="评分规则" extra={<Badge tone="blue">字段已预留真实接入能力</Badge>}><Table columns={['规则名称', '指标编码', '所属维度', '数据来源字段', '统计周期', '计算方式', '分值上限', '启用状态', '适用企业类型']} rows={ruleRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreRule) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.metricCode}</td><td>{dimensionRows.find(dimension => dimension.id === item.dimensionId)?.name || '-'}</td><td className="wrap-cell">{item.dataSourceField}</td><td>{item.statPeriod}</td><td>{item.calcMethod}</td><td>{item.maxScore}</td><td>{item.enabled ? <Badge tone="emerald">启用</Badge> : <Badge tone="slate">停用</Badge>}</td><td className="wrap-cell">{item.enterpriseTypes.join(' / ')}</td></tr>} /></Card></div>}

          {page === 'hazards' && (
            <Card
              title={hazardListScope === 'pendingReview' ? '待复查隐患台账' : hazardListScope === 'overdueOpen' ? '超期未闭环台账' : '隐患闭环台账'}
              extra={
                <div className="inline-row">
                  {activeHazardEnterpriseName && <Badge tone="blue">{activeHazardEnterpriseName}</Badge>}
                  <Badge tone={hazardListScope === 'all' ? 'slate' : 'amber'}>{hazardRowsForPage.length} 项</Badge>
                </div>
              }
            >
              <Table
                columns={['隐患内容', '企业', '等级', '状态', '来源', '发现时间', '整改期限']}
                rows={hazardRowsForPage}
                renderRow={item => (
                  <tr key={item.id} className="clickable-row" onClick={() => openEnterpriseDetail(item.enterpriseId)}>
                    <td className="cell strong wrap-cell">{item.title}</td>
                    <td>{item.enterpriseName}</td>
                    <td><RiskBadge level={item.level} /></td>
                    <td><StatusBadge value={item.status} /></td>
                    <td>{item.source}</td>
                    <td>{item.foundAt}</td>
                    <td>{item.deadline}</td>
                  </tr>
                )}
              />
            </Card>
          )}

          {page === 'devices' && <Card title="设备 / 物联展示" extra={<Badge tone="amber">评分规则已预留来源字段</Badge>}><Table columns={['设备名称', '企业', '类型', '位置', '状态', '最近心跳']} rows={devices.map(item => ({ ...item, enterpriseName: enterprises.find(ent => ent.id === item.enterpriseId)?.name || '-' }))} renderRow={item => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.enterpriseName}</td><td>{item.type}</td><td>{item.location}</td><td><DeviceBadge status={item.status} /></td><td>{item.heartbeat}</td></tr>} /></Card>}

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
                <div className="section-subtitle">现场图片 / 证据</div>
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
