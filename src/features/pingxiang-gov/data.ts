import type {
  ExamResult,
  HazardRecord,
  HazardStatus,
  PatrolRecord,
  PatrolStatus,
  PilotCompany,
  TrainingRecord,
  TrainingStatus,
  WorkPermitRecord,
  WorkPermitStatus,
} from './types'

const project_id = 'pingxiang' as const
const demo_data = true as const
const role = 'gov_viewer' as const

export const pilotCompanies: PilotCompany[] = [
  {
    project_id,
    company_id: 'px-company-001',
    company_name: '平乡县兴安机械制造有限公司',
    industry: '机械制造',
    address: '平乡县工业聚集区兴安路 16 号',
    contact_name: '赵建国',
    contact_phone: '13800010001',
    enabled: true,
    enabled_features: { hazard: true, workPermit: true, patrol: true, training: true },
    role,
    demo_data,
  },
  {
    project_id,
    company_id: 'px-company-002',
    company_name: '平乡县宏达童车配件有限公司',
    industry: '童车配件',
    address: '平乡县河古庙镇配件产业园 8 号',
    contact_name: '李海峰',
    contact_phone: '13800010002',
    enabled: true,
    enabled_features: { hazard: true, workPermit: true, patrol: true, training: true },
    role,
    demo_data,
  },
  {
    project_id,
    company_id: 'px-company-003',
    company_name: '平乡县瑞通橡塑制品有限公司',
    industry: '橡塑制品',
    address: '平乡县节固镇橡塑园区 3 号',
    contact_name: '王瑞强',
    contact_phone: '13800010003',
    enabled: true,
    enabled_features: { hazard: true, workPermit: false, patrol: true, training: true },
    role,
    demo_data,
  },
]

const hazardStatuses: HazardStatus[] = ['待整改', '整改中', '已整改', '已复查', '超期未整改']
const permitStatuses: WorkPermitStatus[] = ['审批中', '已通过', '已完成', '已驳回', '已完成']
const patrolStatuses: PatrolStatus[] = ['正常', '异常', '漏检', '正常', '正常', '异常', '正常', '漏检', '正常', '正常']
const trainingStatuses: TrainingStatus[] = ['已完成', '已完成', '未完成', '已完成', '已完成', '已完成', '未完成', '已完成', '已完成', '已完成']
const examResults: ExamResult[] = ['合格', '合格', '不合格', '合格', '合格', '不合格', '合格', '合格', '合格', '不合格']

const hazardTitles = ['配电箱周边堆放杂物', '消防通道临时占用', '灭火器点检记录缺失', '设备防护罩松动', '危化品标识不清']
const permitTypes = ['动火作业票', '临时用电作业票', '高处作业票', '受限空间作业票', '吊装作业票']
const patrolRoutes = ['生产车间巡检线', '仓储消防巡查线', '配电室巡查线', '厂区通道巡查线', '宿舍食堂巡查线']
const people = ['张明', '刘洋', '陈静', '赵磊', '孙佳', '李娜', '周强', '王敏', '高鹏', '许蕾']

export const hazardRecords: HazardRecord[] = pilotCompanies.flatMap((company, companyIndex) =>
  hazardStatuses.map((status, index) => ({
    project_id,
    company_id: company.company_id,
    id: `px-hazard-${companyIndex + 1}-${index + 1}`,
    title: hazardTitles[index],
    level: index === 0 || index === 4 ? '高' : index === 1 || index === 3 ? '中' : '低',
    status,
    reported_at: `2026-06-${String(10 + companyIndex + index).padStart(2, '0')} 09:30`,
    deadline: `2026-06-${String(17 + companyIndex + index).padStart(2, '0')}`,
    responsible_person: people[(companyIndex * 2 + index) % people.length],
    demo_data,
  })),
)

export const workPermitRecords: WorkPermitRecord[] = pilotCompanies.flatMap((company, companyIndex) =>
  permitStatuses.map((status, index) => ({
    project_id,
    company_id: company.company_id,
    id: `px-permit-${companyIndex + 1}-${index + 1}`,
    permit_type: permitTypes[index],
    location: ['焊接区', '注塑车间', '成品库', '维修间', '装配线'][index],
    status,
    applicant: people[(companyIndex + index) % people.length],
    submitted_at: `2026-06-${String(11 + companyIndex + index).padStart(2, '0')} 14:20`,
    demo_data,
  })),
)

export const patrolRecords: PatrolRecord[] = pilotCompanies.flatMap((company, companyIndex) =>
  Array.from({ length: 10 }, (_, index) => ({
    project_id,
    company_id: company.company_id,
    id: `px-patrol-${companyIndex + 1}-${index + 1}`,
    route_name: patrolRoutes[index % patrolRoutes.length],
    checkpoint: `${['东门', '西侧通道', '配电室', '消防泵房', '原料库'][index % 5]} ${index + 1} 号点`,
    status: patrolStatuses[index],
    inspector: people[(companyIndex + index + 2) % people.length],
    checked_at: `2026-06-${String(8 + Math.floor(index / 2) + companyIndex).padStart(2, '0')} ${String(8 + index).padStart(2, '0')}:10`,
    demo_data,
  })),
)

export const trainingRecords: TrainingRecord[] = pilotCompanies.flatMap((company, companyIndex) =>
  Array.from({ length: 10 }, (_, index) => ({
    project_id,
    company_id: company.company_id,
    id: `px-training-${companyIndex + 1}-${index + 1}`,
    person_name: people[index],
    course_name: index % 2 === 0 ? '四项闭环试点操作培训' : '企业安全风险辨识培训',
    status: trainingStatuses[index],
    exam_result: examResults[(index + companyIndex) % examResults.length],
    score: examResults[(index + companyIndex) % examResults.length] === '合格' ? 82 + ((index + companyIndex) % 15) : 58 + (index % 8),
    completed_at: trainingStatuses[index] === '已完成' ? `2026-06-${String(12 + companyIndex + index).padStart(2, '0')} 16:00` : '',
    demo_data,
  })),
)
