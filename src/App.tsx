import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
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
type Tone = 'red' | 'amber' | 'emerald' | 'blue' | 'slate' | 'violet' | 'cyan'
type StatPeriod = '按月' | '按季度'
type CalcMethod = 'threshold' | 'range' | 'deduction' | 'weight'
type SchemeStatus = '启用' | '草稿'

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

function App() {
  const [page, setPage] = useState<PageKey>('dashboard')
  const [perspective, setPerspective] = useState<Perspective>('安全服务商')
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState('ent-002')
  const [selectedMonth, setSelectedMonth] = useState('2026-03')
  const [message, setMessage] = useState('')
  const [approvals] = useState(initialApprovals)
  const [schemeRows, setSchemeRows] = useState(initialSchemes)
  const [dimensionRows, setDimensionRows] = useState(initialDimensions)
  const [ruleRows, setRuleRows] = useState(initialRules)
  const [levelRows, setLevelRows] = useState(initialLevelRanges)
  const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>(() => enterprises.flatMap(ent => ['2026-01', '2026-02'].map(month => snapshotFor('scheme-v1', ent, month, initialApprovals, initialDimensions, initialRules, initialLevelRanges))))
  const [drawer, setDrawer] = useState<{ snapshotId: string; dimensionId?: string | null } | null>(null)
  const [taskListScope, setTaskListScope] = useState<'all' | 'today' | 'weekCompleted' | 'monthly'>('all')
  const [hazardListScope, setHazardListScope] = useState<'all' | 'pendingReview' | 'overdueOpen'>('all')
  const [selectedTaskId, setSelectedTaskId] = useState('')
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
  const taskRowsForPage = serviceTaskRows.filter(item => matchesTaskScope(item, taskListScope))
  const selectedTask = taskRowsForPage.find(item => item.id === selectedTaskId) || taskRowsForPage[0] || serviceTaskRows[0]
  const hazardRowsForPage = hazards.filter(item => hazardListScope === 'pendingReview' ? item.status === '待复查' : hazardListScope === 'overdueOpen' ? item.status !== '已闭环' && item.deadline < dashboardToday : true).map(item => ({ ...item, enterpriseName: enterprises.find(ent => ent.id === item.enterpriseId)?.name || '-' }))

  const openTaskCenter = (scope: 'all' | 'today' | 'weekCompleted' | 'monthly', taskId?: string) => {
    const scopedRows = serviceTaskRows.filter(item => matchesTaskScope(item, scope))
    setTaskListScope(scope)
    setSelectedTaskId(taskId || scopedRows[0]?.id || '')
    setPage('tasks')
  }

  const openEnterpriseDetail = (enterpriseId: string) => {
    setSelectedEnterpriseId(enterpriseId)
    setPage('detail')
  }

  const overviewCards = [
    { key: 'today', title: '今日待执行任务数', value: `${taskCountToday}项`, desc: '进入任务中心查看今天必须处理的任务清单。', icon: ClipboardCheck, action: () => openTaskCenter('today') },
    { key: 'week', title: '本周已完成任务数', value: `${taskCompletedWeek}项`, desc: '查看本周已交付和待验收任务。', icon: CalendarDays, action: () => openTaskCenter('weekCompleted') },
    { key: 'review', title: '待复查隐患数', value: `${hazardPendingReview}项`, desc: '直达待复查隐患清单，优先安排复核。', icon: FileWarning, action: () => { setHazardListScope('pendingReview'); setPage('hazards') } },
    { key: 'overdue', title: '超期未闭环数', value: `${overdueOpenCount}项`, desc: '查看超期未闭环隐患，优先催办闭环。', icon: AlertTriangle, action: () => { setHazardListScope('overdueOpen'); setPage('hazards') } },
    { key: 'covered', title: '已覆盖企业数 / 总企业数', value: `${enterpriseCoveredCount}/${enterpriseTotalCount}`, desc: '查看本月已服务企业覆盖情况。', icon: Building2, action: () => setPage('enterprises') },
    { key: 'completion', title: '本月服务完成率', value: `${monthlyServiceCompletionRate}%`, desc: '查看本月任务推进进度和待交付事项。', icon: Gauge, action: () => openTaskCenter('monthly') },
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

          {page === 'dashboard' && <div className="stack-lg"><div className="hero-banner"><div><div className="hero-title">服务商首页</div><div className="hero-desc">今天先处理到期任务和待复查隐患，再关注高风险企业的闭环压力；下方工作台同时给出行动入口、风险提醒和月度交付结果。</div></div><PerspectiveBadge value="安全服务商" /></div><div className="overview-grid">{overviewCards.map(item => { const Icon = item.icon; return <button key={item.key} className="overview-card" onClick={item.action}><div className="overview-card-head"><div><div className="overview-card-title">{item.title}</div><div className="overview-card-value">{item.value}</div></div><div className="overview-card-icon"><Icon className="icon-md" /></div></div><div className="overview-card-desc">{item.desc}</div></button> })}</div><div className="dashboard-main-grid"><Card title="今日待办任务" extra={<div className="inline-row"><Badge tone="amber">{filteredTodayTaskRows.length} 项待处理</Badge><button className="btn btn-xs btn-light" onClick={() => openTaskCenter('today', filteredTodayTaskRows[0]?.id)}>查看全部</button></div>}><div className="dashboard-filter-row"><Select value={dashboardEnterpriseFilter} onChange={setDashboardEnterpriseFilter} options={enterpriseFilterOptions} /><Select value={dashboardStatusFilter} onChange={setDashboardStatusFilter} options={taskStatusOptions} /><Select value={dashboardPriorityFilter} onChange={value => setDashboardPriorityFilter(value as 'all' | TaskPriority)} options={priorityOptions} /></div><div className="spacer-sm" />{filteredTodayTaskRows.length ? <Table className="task-table" columns={['任务名称', '企业名称', '任务类型', '截止时间', '当前状态', '优先级', '操作']} rows={filteredTodayTaskRows} renderRow={item => <tr key={item.id} className="clickable-row" onClick={() => openTaskCenter('today', item.id)}><td className="cell strong wrap-cell">{item.taskName}</td><td className="wrap-cell">{item.enterpriseName}</td><td>{item.taskType}</td><td>{item.dueDate}</td><td><StatusBadge value={item.taskStatus} /></td><td><PriorityBadge value={item.priority} /></td><td><button className="btn btn-xs btn-dark" onClick={event => { event.stopPropagation(); openTaskCenter('today', item.id) }}>查看详情</button></td></tr>} /> : <div className="empty-state">当前筛选条件下没有待办任务。</div>}</Card><Card title="风险提醒" extra={<Badge tone="red">优先跟进高风险企业</Badge>}><div className="risk-list">{riskRows.map(item => <button key={item.enterpriseId} className="risk-item" onClick={() => openEnterpriseDetail(item.enterpriseId)}><div className="risk-item-head"><div><div className="title-sm">{item.enterpriseName}</div><div className="small muted">最近一次服务时间：{item.lastServiceDate}</div></div><RiskBadge level={item.riskLevel} /></div><div className="risk-item-grid"><div className="surface-box"><div className="muted">未闭环隐患数</div><div className="title-sm">{item.openHazardCount}</div></div><div className="surface-box"><div className="muted">超期项数</div><div className="title-sm">{item.overdueCount}</div></div></div></button>)}</div></Card></div><Card title="月度交付概览" extra={<Badge tone="cyan">截至 {dashboardMonth}</Badge>}><div className="delivery-grid"><div className="mini-card"><div className="muted">已完成任务数</div><div className="title-sm">{monthlyCompletedTaskCount} 项</div></div><div className="mini-card"><div className="muted">闭环隐患数</div><div className="title-sm">{monthlyClosedHazardCount} 项</div></div><div className="mini-card"><div className="muted">本月新增隐患数</div><div className="title-sm">{monthlyNewHazardCount} 项</div></div><div className="mini-card"><div className="muted">企业覆盖率</div><div className="title-sm">{enterpriseCoverageRate}%</div></div><div className="mini-card"><div className="muted">月度快照已生成企业数</div><div className="title-sm">{monthlySnapshotEnterpriseCount} 家</div></div></div></Card></div>}

          {page === 'enterprises' && <Card title={`${perspective}企业列表`} extra={<div className="search-wrap"><Search className="search-icon" /><input className="search-input" value={selectedEnterprise.name} readOnly /></div>}><Table columns={['企业名称', '行业', '区域', '试用版得分', '等级', '高风险隐患', '操作']} rows={enterprises} renderRow={(item: Enterprise) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.industry}</td><td>{item.area}</td><td>{latestMap[item.id].totalScore}</td><td><Badge tone={latestMap[item.id].levelColor}>{latestMap[item.id].levelName}</Badge></td><td>{hazards.filter(h => h.enterpriseId === item.id && h.level === '高' && h.status !== '已闭环').length}</td><td><div className="button-row"><button className="btn btn-xs btn-light" onClick={() => openEnterpriseDetail(item.id)}>详情</button><button className="btn btn-xs btn-dark" onClick={() => { setSelectedEnterpriseId(item.id); setPage('scoreDetail') }}>评分</button></div></td></tr>} /></Card>}

          {page === 'detail' && <div className="stack-lg"><div className="entity-switch">{enterprises.map(item => <button key={item.id} onClick={() => setSelectedEnterpriseId(item.id)} className={cn('entity-chip', item.id === selectedEnterpriseId && 'entity-chip-active')}>{item.name}</button>)}</div><div className="two-col-hero"><Card title="企业基础信息" extra={<div className="inline-row"><PerspectiveBadge value={perspective} /><RiskBadge level={selectedEnterprise.risk} /></div>}><div className="info-grid"><div className="info-field"><div className="field-label with-icon"><Factory className="icon-xs" /> 企业名称</div><div className="field-value">{selectedEnterprise.name}</div></div><div className="info-field"><div className="field-label with-icon"><LayoutGrid className="icon-xs" /> 行业类别</div><div className="field-value">{selectedEnterprise.industry}</div></div><div className="info-field"><div className="field-label with-icon"><MapPinned className="icon-xs" /> 所在区域</div><div className="field-value">{selectedEnterprise.area}</div></div><div className="info-field"><div className="field-label with-icon"><Briefcase className="icon-xs" /> 负责人</div><div className="field-value">{selectedEnterprise.leader}</div></div><div className="info-field span-2"><div className="field-label with-icon"><Users className="icon-xs" /> 联系方式</div><div className="field-value">{selectedEnterprise.phone}</div></div></div></Card><Card title="评分摘要" extra={<Badge tone={latestMap[selectedEnterprise.id].levelColor}>{latestMap[selectedEnterprise.id].levelName}</Badge>}><div className="summary-grid"><div className="mini-card"><div className="muted">最新分数</div><div className="title-sm">{latestMap[selectedEnterprise.id].totalScore}</div></div><div className="mini-card"><div className="muted">快照月份</div><div className="title-sm">{latestMap[selectedEnterprise.id].month}</div></div><div className="mini-card"><div className="muted">高风险隐患</div><div className="title-sm">{hazards.filter(item => item.enterpriseId === selectedEnterprise.id && item.level === '高' && item.status !== '已闭环').length}</div></div><div className="mini-card"><div className="muted">异常设备</div><div className="title-sm">{devices.filter(item => item.enterpriseId === selectedEnterprise.id && item.status !== '在线').length}</div></div></div><div className="spacer-sm" /><div className="button-row"><button className="btn btn-dark" onClick={() => setPage('scoreDetail')}>评分详情</button><button className="btn btn-blue" onClick={() => setPage('scoreTrend')}>评分趋势</button></div></Card></div></div>}

          {page === 'scoreDetail' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">企业评分详情页</div><div className="page-subtitle">支持按企业 + 月份生成评分结果快照，历史快照不可被覆盖。</div></div><div className="button-row"><button className="btn btn-dark" onClick={buildSnapshot}>生成评分快照</button><button className="btn btn-light" onClick={() => setDrawer({ snapshotId: visibleSnapshot.id })}><PanelRightOpen className="icon-sm" />扣分明细</button></div></div><div className="score-toolbar"><div className="score-toolbar-group"><div className="field-label">企业</div><Select value={selectedEnterpriseId} onChange={setSelectedEnterpriseId} options={entOptions} /></div><div className="score-toolbar-group"><div className="field-label">月份</div><Select value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} /></div><div className="score-toolbar-group"><div className="field-label">方案</div><div className="surface-outline"><div className="title-sm">{activeScheme.name}</div><div className="small muted">{activeScheme.version} · {activeScheme.snapshotPolicy}</div></div></div></div><div className="grid-4"><StatCard title="得分" value={visibleSnapshot.totalScore} subtitle={currentSnapshot ? '已锁定快照' : '当前实时试算'} icon={Calculator} /><StatCard title="等级" value={visibleSnapshot.levelName} subtitle="按评分等级区间判定" icon={Sparkles} /><StatCard title="启用规则" value={ruleRows.filter(item => item.enabled).length} subtitle="当前方案规则数" icon={SlidersHorizontal} /><StatCard title="快照状态" value={currentSnapshot ? '已生成' : '未生成'} subtitle={currentSnapshot ? currentSnapshot.generatedAt : '可点击上方按钮生成'} icon={CalendarDays} /></div><div className="two-col"><Card title="维度得分" extra={<Badge tone="cyan">当前月份</Badge>}><Table columns={['维度', '得分', '满分', '扣减', '操作']} rows={visibleSnapshot.dimensionScores} renderRow={(item: DimensionScore) => <tr key={item.dimensionId}><td className="cell strong">{item.dimensionName}</td><td>{item.score}</td><td>{item.fullScore}</td><td>{item.deductions}</td><td><button className="btn btn-xs btn-light" onClick={() => setDrawer({ snapshotId: visibleSnapshot.id, dimensionId: item.dimensionId })}>扣分明细</button></td></tr>} /></Card><Card title="来源指标试算" extra={<Badge tone="violet">真实接口字段已预留</Badge>}><div className="stack">{Object.entries(visibleSnapshot.metrics).map(([key, value]) => <div key={key} className="surface-outline"><div className="list-card-head"><div className="title-sm">{key}</div><Badge tone="blue">{String(value)}</Badge></div></div>)}</div></Card></div><Card title="规则映射清单" extra={<Badge tone="amber">每条规则字段齐全</Badge>}><Table columns={['规则名称', '指标编码', '所属维度', '数据来源字段', '统计周期', '计算方式', '分值上限', '启用状态', '适用企业类型']} rows={ruleRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreRule) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.metricCode}</td><td>{dimensionRows.find(dimension => dimension.id === item.dimensionId)?.name || '-'}</td><td className="wrap-cell">{item.dataSourceField}</td><td>{item.statPeriod}</td><td>{item.calcMethod}</td><td>{item.maxScore}</td><td>{item.enabled ? <Badge tone="emerald">启用</Badge> : <Badge tone="slate">停用</Badge>}</td><td className="wrap-cell">{item.enterpriseTypes.join(' / ')}</td></tr>} /></Card></div>}

          {page === 'scoreTrend' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">评分趋势页</div><div className="page-subtitle">按企业查看历史快照，不做覆盖，只追加新月份。</div></div><button className="btn btn-dark" onClick={buildSnapshot}>生成当前月份快照</button></div><div className="score-toolbar"><div className="score-toolbar-group"><div className="field-label">企业</div><Select value={selectedEnterpriseId} onChange={setSelectedEnterpriseId} options={entOptions} /></div><div className="score-toolbar-group"><div className="field-label">说明</div><div className="surface-outline"><div className="title-sm">{selectedEnterprise.name}</div><div className="small muted">已保存 {trendRows.length} 条评分历史</div></div></div></div><Card title="月度趋势" extra={<Badge tone="cyan">历史快照不覆盖</Badge>}><div className="stack">{trendRows.map(item => <div key={item.id} className="surface-outline"><div className="list-card-head"><div><div className="title-sm">{item.month}</div><div className="small muted">{item.generatedAt}</div></div><div className="inline-row"><Badge tone={item.levelColor}>{item.levelName}</Badge><div className="title-sm">{item.totalScore}</div></div></div><div className="spacer-sm" /><div className="progress-track"><div className="progress-bar progress-blue" style={{ width: `${item.totalScore}%` }} /></div><div className="score-trend-grid">{item.dimensionScores.map(dimension => <div key={dimension.dimensionId} className="mini-card"><div className="muted">{dimension.dimensionName}</div><div className="title-sm">{dimension.score}/{dimension.fullScore}</div></div>)}</div></div>)}</div></Card></div>}

          {page === 'scoreConfig' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">评分机制配置页</div><div className="page-subtitle">支持评分方案、维度、规则、等级区间的试用态配置。</div></div><button className="btn btn-dark" onClick={() => setMessage('评分配置已保存在前端试用态')}>保存配置</button></div><Card title="评分方案" extra={<Badge tone="violet">试用版</Badge>}><Table columns={['方案名称', '版本', '状态', '生效时间', '快照策略', '描述', '操作']} rows={schemeRows} renderRow={(item: ScoreScheme) => <tr key={item.id}><td className="cell strong">{item.name}</td><td>{item.version}</td><td><StatusBadge value={item.status} /></td><td>{item.effectiveFrom}</td><td>{item.snapshotPolicy}</td><td className="wrap-cell">{item.description}</td><td><button className="btn btn-xs btn-light" onClick={() => { setSchemeRows(prev => prev.map(row => ({ ...row, status: row.id === item.id ? '启用' : '草稿' }))); setMessage(`已切换启用方案：${item.name}`) }}>设为启用</button></td></tr>} /></Card><div className="two-col"><Card title="评分维度" extra={<Badge tone="cyan">当前方案</Badge>}><Table columns={['维度编码', '维度名称', '权重', '排序', '说明']} rows={dimensionRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreDimension) => <tr key={item.id}><td>{item.code}</td><td className="cell strong">{item.name}</td><td><input className="inline-input" type="number" value={item.weight} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, weight: Number(event.target.value) } : row))} /></td><td><input className="inline-input" type="number" value={item.order} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, order: Number(event.target.value) } : row))} /></td><td className="wrap-cell"><input className="inline-input" value={item.note} onChange={event => setDimensionRows(prev => prev.map(row => row.id === item.id ? { ...row, note: event.target.value } : row))} /></td></tr>} /></Card><Card title="评分等级区间" extra={<Badge tone="amber">快照按生成时锁定</Badge>}><Table columns={['等级', '最小值', '最大值', '颜色', '说明']} rows={levelRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreLevelRange) => <tr key={item.id}><td className="cell strong">{item.name}</td><td><input className="inline-input" type="number" value={item.min} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, min: Number(event.target.value) } : row))} /></td><td><input className="inline-input" type="number" value={item.max} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, max: Number(event.target.value) } : row))} /></td><td><select value={item.color} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, color: event.target.value as Tone } : row))}>{(['emerald', 'blue', 'amber', 'red'] as Tone[]).map(tone => <option key={tone} value={tone}>{tone}</option>)}</select></td><td className="wrap-cell"><input className="inline-input" value={item.description} onChange={event => setLevelRows(prev => prev.map(row => row.id === item.id ? { ...row, description: event.target.value } : row))} /></td></tr>} /></Card></div><Card title="评分规则" extra={<Badge tone="blue">字段已预留真实接入能力</Badge>}><Table columns={['规则名称', '指标编码', '所属维度', '数据来源字段', '统计周期', '计算方式', '分值上限', '启用状态', '适用企业类型']} rows={ruleRows.filter(item => item.schemeId === activeScheme.id)} renderRow={(item: ScoreRule) => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.metricCode}</td><td>{dimensionRows.find(dimension => dimension.id === item.dimensionId)?.name || '-'}</td><td className="wrap-cell">{item.dataSourceField}</td><td>{item.statPeriod}</td><td>{item.calcMethod}</td><td>{item.maxScore}</td><td>{item.enabled ? <Badge tone="emerald">启用</Badge> : <Badge tone="slate">停用</Badge>}</td><td className="wrap-cell">{item.enterpriseTypes.join(' / ')}</td></tr>} /></Card></div>}

          {page === 'hazards' && <Card title={hazardListScope === 'pendingReview' ? '待复查隐患台账' : hazardListScope === 'overdueOpen' ? '超期未闭环台账' : '隐患闭环台账'} extra={<Badge tone={hazardListScope === 'all' ? 'slate' : 'amber'}>{hazardRowsForPage.length} 项</Badge>}><Table columns={['隐患内容', '企业', '等级', '状态', '来源', '发现时间', '整改期限']} rows={hazardRowsForPage} renderRow={item => <tr key={item.id} className="clickable-row" onClick={() => openEnterpriseDetail(item.enterpriseId)}><td className="cell strong wrap-cell">{item.title}</td><td>{item.enterpriseName}</td><td><RiskBadge level={item.level} /></td><td><StatusBadge value={item.status} /></td><td>{item.source}</td><td>{item.foundAt}</td><td>{item.deadline}</td></tr>} /></Card>}

          {page === 'devices' && <Card title="设备 / 物联展示" extra={<Badge tone="amber">评分规则已预留来源字段</Badge>}><Table columns={['设备名称', '企业', '类型', '位置', '状态', '最近心跳']} rows={devices.map(item => ({ ...item, enterpriseName: enterprises.find(ent => ent.id === item.enterpriseId)?.name || '-' }))} renderRow={item => <tr key={item.id}><td className="cell strong wrap-cell">{item.name}</td><td>{item.enterpriseName}</td><td>{item.type}</td><td>{item.location}</td><td><DeviceBadge status={item.status} /></td><td>{item.heartbeat}</td></tr>} /></Card>}

          {page === 'tasks' && <div className="stack-lg"><div className="section-head"><div><div className="section-title">任务中心</div><div className="page-subtitle">{taskListScope === 'today' ? '当前展示今天需要优先执行的任务。' : taskListScope === 'weekCompleted' ? '当前展示本周已完成或已交付待验收任务。' : taskListScope === 'monthly' ? '当前展示本月任务推进情况。' : '当前展示全部服务任务。'}</div></div><div className="inline-row"><Badge tone="violet">{taskRowsForPage.length} 项</Badge><button className="btn btn-xs btn-light" onClick={() => openTaskCenter('all')}>查看全部任务</button></div></div><div className="task-layout"><Card title="任务清单" extra={<Badge tone="blue">{selectedTask ? selectedTask.enterpriseName : '暂无任务'}</Badge>}>{taskRowsForPage.length ? <Table className="task-table" columns={['任务名称', '企业', '任务类型', '截至日期', '状态', '优先级']} rows={taskRowsForPage} renderRow={item => <tr key={item.id} className={cn('clickable-row', selectedTask?.id === item.id && 'row-active')} onClick={() => setSelectedTaskId(item.id)}><td className="cell strong wrap-cell">{item.taskName}</td><td className="wrap-cell">{item.enterpriseName}</td><td>{item.taskType}</td><td>{item.dueDate}</td><td><StatusBadge value={item.taskStatus} /></td><td><PriorityBadge value={item.priority} /></td></tr>} /> : <div className="empty-state">当前范围内没有任务。</div>}</Card><Card title="任务详情" extra={selectedTask ? <StatusBadge value={selectedTask.taskStatus} /> : undefined}>{selectedTask ? <div className="stack"><div className="surface-outline row-active-panel"><div className="title-sm">{selectedTask.taskName}</div><div className="small muted">{selectedTask.enterpriseName}</div></div><div className="summary-grid"><div className="mini-card"><div className="muted">任务类型</div><div className="title-sm">{selectedTask.taskType}</div></div><div className="mini-card"><div className="muted">截止时间</div><div className="title-sm">{selectedTask.dueDate}</div></div><div className="mini-card"><div className="muted">当前状态</div><div className="mt-8"><StatusBadge value={selectedTask.taskStatus} /></div></div><div className="mini-card"><div className="muted">优先级</div><div className="mt-8"><PriorityBadge value={selectedTask.priority} /></div></div></div><div className="surface-outline"><div className="section-subtitle">当前要做什么</div><div className="body mt-8">{selectedTask.focus}</div></div><div className="surface-outline"><div className="section-subtitle">执行信息</div><div className="body mt-8">执行方：{selectedTask.assignee}</div><div className="body">最近动作：{selectedTask.latestAction}</div><div className="body">未闭环隐患数：{selectedTask.openHazardCount}</div><div className="body">超期项数：{selectedTask.overdueCount}</div></div><div className="button-row"><button className="btn btn-dark" onClick={() => openEnterpriseDetail(selectedTask.enterpriseId)}>查看企业画像</button><button className="btn btn-light" onClick={() => { setSelectedEnterpriseId(selectedTask.enterpriseId); setPage('scoreDetail') }}>查看评分详情</button></div></div> : <div className="empty-state">请选择左侧任务查看详情。</div>}</Card></div></div>}

          {page === 'users' && <div className="stack-lg"><div className="two-col">{(['企业', '安全服务商', '保险平台', '应急局'] as Perspective[]).map(group => <Card key={group} title={`${group}角色成员`} extra={<PerspectiveBadge value={group} />}><Table columns={['姓名', '所属单位', '岗位', '数据范围', '状态', '最近登录']} rows={users.filter(item => item.group === group)} renderRow={(item: UserItem) => <tr key={item.id}><td className="cell strong">{item.name}</td><td>{item.org}</td><td>{item.role}</td><td>{item.scope}</td><td><StatusBadge value={item.status} /></td><td>{item.lastLogin}</td></tr>} /></Card>)}</div><Card title="数据分层可见规则" extra={<Badge tone="cyan">默认可见范围</Badge>}><Table columns={['角色', '可见内容', '默认不可见']} rows={privacyRules} renderRow={item => <tr key={item.audience}><td className="cell strong">{item.audience}</td><td className="wrap-cell">{item.visible}</td><td className="wrap-cell">{item.hidden}</td></tr>} /></Card></div>}

          {page === 'bigscreen' && <Card title="演示总览" extra={<Badge tone="amber">本次不扩展大屏</Badge>}><div className="body">本轮只做评分试用版能力，没有新增复杂大屏；保留该入口仅用于说明本次边界。</div></Card>}
        </div>
      </div>

      {drawerSnapshot && <><div className="drawer-mask" onClick={() => setDrawer(null)} /><aside className="drawer-panel"><div className="drawer-head"><div><div className="page-title" style={{ fontSize: 22 }}>扣分明细抽屉</div><div className="page-subtitle">{drawerSnapshot.enterpriseName} · {drawerSnapshot.month} · 历史不可覆盖</div></div><button className="btn btn-light" onClick={() => setDrawer(null)}>关闭</button></div><div className="stack-lg">{detailRows.map(item => <div key={item.id} className="surface-outline"><div className="list-card-head"><div><div className="title-sm">{item.ruleName}</div><div className="small muted">{item.dimensionName} · {item.metricCode}</div></div><Badge tone={item.deducted > 0 ? 'red' : 'emerald'}>{item.score}/{item.maxScore}</Badge></div><div className="spacer-sm" /><div className="body">实际值：{item.actualValue}</div><div className="body">扣分说明：{item.reason}</div><div className="small muted">来源字段：{item.dataSourceField}</div><div className="small muted">来源表：{item.sourceTable}</div><div className="small muted">API 字段：{item.sourceApiField}</div></div>)}</div></aside></>}
    </div>
  )
}

export default App
