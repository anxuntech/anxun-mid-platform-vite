import type {
  EvidenceFile,
  HazardRecord,
  HazardStatus,
  PatrolRecord,
  PilotCompany,
  TimelineNode,
  TrainingParticipant,
  TrainingRecord,
  WorkPermitRecord,
  WorkPermitStatus,
} from './types'

const project_id = 'pingxiang' as const
const demo_data = true as const
const role = 'gov_viewer' as const

const companySeeds = [
  ['兴安机械制造', '机械制造'], ['宏达童车配件', '童车配件'], ['瑞通橡塑制品', '橡塑制品'],
  ['恒泰自行车配件', '童车配件'], ['华盛精密轴承', '机械制造'], ['金源塑胶制品', '橡塑制品'],
  ['东升五金加工', '五金加工'], ['顺达仓储物流', '仓储物流'], ['新航金属制品', '五金加工'],
  ['永安机械设备', '机械制造'], ['鑫达童车制造', '童车配件'], ['宏远包装材料', '包装材料'],
  ['华诚橡塑科技', '橡塑制品'], ['嘉诚电器配件', '电器制造'], ['盛达精密制造', '机械制造'],
  ['恒信仓储服务', '仓储物流'], ['天成纺织制品', '纺织加工'], ['德润金属加工', '五金加工'],
  ['安泰儿童用品', '童车配件'], ['联创机械科技', '机械制造'], ['汇鑫橡塑制品', '橡塑制品'],
  ['众诚包装制品', '包装材料'], ['华宇自行车配件', '童车配件'], ['瑞丰纺织加工', '纺织加工'],
  ['腾达机械制造', '机械制造'], ['昌盛电器设备', '电器制造'], ['佳和仓储服务', '仓储物流'],
  ['远航五金制品', '五金加工'], ['新盛塑料科技', '橡塑制品'], ['鑫源儿童用品', '童车配件'],
] as const

const people = ['张明', '刘洋', '陈静', '赵磊', '孙佳', '李娜', '周强', '王敏', '高鹏', '许蕾', '韩松', '马超']
const recentDate = (index: number, hour = 9) => `2026-07-${String(4 + (index % 17)).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${index % 2 ? '30' : '10'}`
const olderDate = (index: number, hour = 9) => `2026-${String(2 + (index % 4)).padStart(2, '0')}-${String(5 + (index % 18)).padStart(2, '0')} ${String(hour).padStart(2, '0')}:20`
const recordDate = (companyIndex: number, itemIndex: number, hour = 9) => companyIndex < 18 && itemIndex > 0
  ? recentDate(companyIndex + itemIndex, hour)
  : olderDate(companyIndex * 2 + itemIndex, hour)

export const pilotCompanies: PilotCompany[] = companySeeds.map(([name, industry], index) => ({
  project_id,
  company_id: `px-company-${String(index + 1).padStart(3, '0')}`,
  company_name: `平乡县${name}有限公司`,
  industry,
  address: `平乡县${['工业聚集区', '河古庙镇产业园', '节固镇工业园', '城东装备制造园'][index % 4]} ${index + 1} 号`,
  contact_name: people[index % people.length],
  contact_phone: `1380001${String(index + 1).padStart(4, '0')}`,
  enabled: index < 27,
  enabled_at: index < 27 ? `2026-01-${String(3 + (index % 22)).padStart(2, '0')}` : '',
  status: index < 27 ? '已开通' : '待开通',
  last_effective_at: index < 18 ? recentDate(index, 16) : index < 24 ? olderDate(index, 16) : '',
  enabled_features: { hazard: true, workPermit: index % 7 !== 0, patrol: true, training: index % 9 !== 0 },
  role,
  demo_data,
}))

const evidence = (recordId: string, kind: EvidenceFile['kind'], count: number, tone: EvidenceFile['tone']): EvidenceFile[] => (
  Array.from({ length: count }, (_, index) => ({ id: `${recordId}-evidence-${index + 1}`, name: `${kind}${index + 1}`, kind, tone }))
)

const timeline = (recordId: string, date: string, steps: Array<[string, string, string]>, currentIndex = steps.length - 1): TimelineNode[] => (
  steps.map(([title, person, note], index) => ({
    id: `${recordId}-timeline-${index + 1}`,
    title,
    person,
    time: index <= currentIndex ? date.replace(/\d{2}:\d{2}$/, `${String(9 + index * 2).padStart(2, '0')}:20`) : '待完成',
    note,
    status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending',
  }))
)

const hazardTitles = ['配电箱周边堆放杂物', '消防通道临时占用', '灭火器点检记录缺失', '设备防护罩松动', '危化品标识不清', '临时用电线路未固定']
const hazardStatuses: HazardStatus[] = ['待整改', '整改中', '待复查', '已销号', '超期未整改', '已销号']

export const hazardRecords: HazardRecord[] = pilotCompanies.slice(0, 24).flatMap((company, companyIndex) => (
  Array.from({ length: companyIndex < 12 ? 3 : 2 }, (_, index) => {
    const sequence = companyIndex * 3 + index
    const id = `PX-YH-${String(sequence + 1).padStart(4, '0')}`
    const status = hazardStatuses[sequence % hazardStatuses.length]
    const reportedAt = recordDate(companyIndex, index, 9)
    const closed = status === '已销号'
    const currentIndex = closed ? 4 : status === '待复查' ? 3 : status === '整改中' ? 2 : 1
    return {
      project_id,
      company_id: company.company_id,
      id,
      title: hazardTitles[sequence % hazardTitles.length],
      description: `${hazardTitles[sequence % hazardTitles.length]}，现场管理状态与企业安全管理要求不一致，需要限期完成整改并留存复查证据。`,
      level: sequence % 5 === 0 ? '高' : sequence % 3 === 0 ? '中' : '低',
      status,
      reporter: people[(sequence + 1) % people.length],
      reported_at: reportedAt,
      deadline: reportedAt.slice(0, 10).replace(/-(\d{2})$/, (_, day) => `-${String(Math.min(28, Number(day) + 7)).padStart(2, '0')}`),
      responsible_person: people[(sequence + 3) % people.length],
      rectification_content: currentIndex >= 2 ? '已清理现场并落实责任区域标识，安排班组进行复核。' : '',
      rectified_at: currentIndex >= 2 ? reportedAt.replace(/\d{2}:\d{2}$/, '14:10') : '',
      reviewer: currentIndex >= 3 ? people[(sequence + 5) % people.length] : '',
      review_opinion: currentIndex >= 3 ? '整改措施有效，现场状态符合本次复查要求。' : '',
      closed_at: closed ? reportedAt.replace(/\d{2}:\d{2}$/, '16:40') : '',
      photos: sequence % 9 === 0 ? [] : evidence(id, '现场照片', 2, 'orange'),
      rectification_photos: currentIndex >= 2 ? evidence(id, '整改照片', 2, 'green') : [],
      linked_patrol_id: sequence % 2 === 0 ? `PX-XJ-${String((companyIndex * 2) + 1).padStart(4, '0')}` : '',
      timeline: timeline(id, reportedAt, [
        ['隐患上报', people[(sequence + 1) % people.length], '完成现场情况登记并提交证据。'],
        ['责任分派', people[(sequence + 2) % people.length], '明确整改责任人与整改期限。'],
        ['整改提交', people[(sequence + 3) % people.length], '提交整改说明和整改后照片。'],
        ['复查确认', people[(sequence + 5) % people.length], '核验整改结果并形成复查意见。'],
        ['销号归档', people[(sequence + 5) % people.length], '完成闭环归档。'],
      ], currentIndex),
      demo_data,
    }
  })
))

const patrolPoints = ['生产车间东侧通道', '配电室', '消防泵房', '原料仓库', '成品装卸区', '办公楼疏散通道']
export const patrolRecords: PatrolRecord[] = pilotCompanies.slice(0, 24).flatMap((company, companyIndex) => (
  Array.from({ length: companyIndex < 12 ? 3 : 2 }, (_, index) => {
    const sequence = companyIndex * 3 + index
    const id = `PX-XJ-${String(sequence + 1).padStart(4, '0')}`
    const abnormal = sequence % 4 === 0
    const missing = sequence % 17 === 0
    const checkedAt = recordDate(companyIndex, index, 10)
    const items = ['通道畅通情况', '消防设施状态', '用电设备状态', '现场物料摆放'].map((name, itemIndex) => ({
      id: `${id}-item-${itemIndex + 1}`,
      name,
      result: missing && itemIndex === 3 ? '未提供' as const : abnormal && itemIndex === 1 ? '异常' as const : '正常' as const,
      note: abnormal && itemIndex === 1 ? '发现现场状态异常，已转隐患跟进。' : '',
    }))
    return {
      project_id,
      company_id: company.company_id,
      id,
      route_name: `${company.industry}日常巡检`,
      checkpoint: patrolPoints[sequence % patrolPoints.length],
      status: missing ? '漏检' : abnormal ? '异常' : '正常',
      inspector: people[(sequence + 2) % people.length],
      checked_at: checkedAt,
      item_count: items.length,
      abnormal_count: abnormal ? 1 : 0,
      result_summary: missing ? '部分检查项未提供结果。' : abnormal ? '发现1项问题，已形成关联隐患。' : '本次检查项均正常。',
      items,
      photos: sequence % 11 === 0 ? [] : evidence(id, '现场照片', 2, abnormal ? 'orange' : 'blue'),
      linked_hazard_id: abnormal ? hazardRecords.find(item => item.company_id === company.company_id)?.id : '',
      qr_code: `PX-POINT-${String((sequence % 40) + 1).padStart(3, '0')}`,
      timeline: timeline(id, checkedAt, [
        ['扫码到达', people[(sequence + 2) % people.length], '识别现场二维码点位。'],
        ['逐项检查', people[(sequence + 2) % people.length], '完成检查项填报与照片留存。'],
        ['结果提交', people[(sequence + 2) % people.length], abnormal ? '问题项已转入隐患闭环。' : '本次检查结果已归档。'],
      ]),
      demo_data,
    }
  })
))

const permitTypes = ['动火作业', '有限空间作业', '高处作业', '临时用电']
const permitStatuses: WorkPermitStatus[] = ['待审批', '已通过', '已驳回', '已完成']
export const workPermitRecords: WorkPermitRecord[] = pilotCompanies.slice(0, 24).map((company, index) => {
  const id = `PX-ZY-${String(index + 1).padStart(4, '0')}`
  const submittedAt = recordDate(index, 1, 8)
  const status = permitStatuses[index % permitStatuses.length]
  const approved = status === '已通过' || status === '已完成'
  return {
    project_id,
    company_id: company.company_id,
    id,
    permit_type: permitTypes[index % permitTypes.length],
    location: ['焊接区', '污水池', '成品库屋面', '设备维修间'][index % 4],
    status,
    applicant: people[index % people.length],
    submitted_at: submittedAt,
    planned_start: submittedAt.replace('08:', '09:'),
    planned_end: submittedAt.replace('08:', '17:'),
    guardian: people[(index + 4) % people.length],
    approvals: [
      { role: '班组负责人', person: people[(index + 1) % people.length], status: '已通过', time: submittedAt, opinion: '作业条件已核对。' },
      { role: '安全管理人员', person: people[(index + 2) % people.length], status: status === '已驳回' ? '已驳回' : approved ? '已通过' : '待审批', time: approved ? submittedAt.replace('08:', '08:') : '', opinion: status === '已驳回' ? '隔离措施不完整，请补充后重新申请。' : approved ? '安全措施符合要求。' : '等待审批。' },
    ],
    measures: ['作业区域完成隔离', '消防器材配置到位', '作业人员完成安全交底', '监护人员全程在岗'].map((content, measureIndex) => ({ id: `${id}-measure-${measureIndex + 1}`, content, confirmed: status !== '待审批' && !(status === '已驳回' && measureIndex === 0) })),
    attachments: index % 8 === 0 ? [] : evidence(id, '附件', 2, 'violet'),
    completed_at: status === '已完成' ? submittedAt.replace('08:', '17:') : '',
    timeline: timeline(id, submittedAt, [
      ['提交申请', people[index % people.length], '提交作业范围、人员和安全措施。'],
      ['现场核验', people[(index + 1) % people.length], '核验作业条件和隔离措施。'],
      ['安全审批', people[(index + 2) % people.length], status === '已驳回' ? '申请已驳回。' : approved ? '审批通过。' : '等待审批。'],
      ['完工确认', people[(index + 4) % people.length], status === '已完成' ? '现场清理完毕，作业票归档。' : '待作业结束后确认。'],
    ], status === '已完成' ? 3 : approved || status === '已驳回' ? 2 : 1),
    demo_data,
  }
})

const buildParticipants = (recordId: string, index: number): TrainingParticipant[] => (
  Array.from({ length: 8 + (index % 5) }, (_, participantIndex) => {
    const completed = participantIndex < 7 + (index % 4)
    const score = completed ? 58 + ((index * 7 + participantIndex * 5) % 40) : null
    return {
      id: `${recordId}-person-${participantIndex + 1}`,
      name: people[(index + participantIndex) % people.length],
      joined_at: `2026-07-${String(5 + (index % 15)).padStart(2, '0')} 14:${String(participantIndex * 4).padStart(2, '0')}`,
      completed,
      score,
      passed: score === null ? null : score >= 70,
    }
  })
)

export const trainingRecords: TrainingRecord[] = pilotCompanies.slice(0, 24).map((company, index) => {
  const id = `PX-PX-${String(index + 1).padStart(4, '0')}`
  const startedAt = recordDate(index, 1, 14)
  const participants = buildParticipants(id, index)
  const completed = participants.filter(item => item.completed)
  const passed = completed.filter(item => item.passed)
  return {
    project_id,
    company_id: company.company_id,
    id,
    person_name: people[index % people.length],
    course_name: index % 2 === 0 ? '企业现场隐患辨识与闭环培训' : '消防设施点检实操培训',
    title: index % 2 === 0 ? '企业现场隐患辨识与闭环培训' : '消防设施点检实操培训',
    method: index % 3 === 0 ? '线下集中培训' : '现场实操培训',
    status: index % 7 === 0 ? '进行中' : '已完成',
    exam_result: passed.length === completed.length && completed.length ? '合格' : '不合格',
    score: completed.length ? Math.round(completed.reduce((sum, item) => sum + (item.score || 0), 0) / completed.length) : 0,
    started_at: startedAt,
    completed_at: index % 7 === 0 ? '' : startedAt.replace('14:', '16:'),
    participants,
    exam_pass_score: 70,
    attachments: index % 10 === 0 ? [] : evidence(id, '附件', 2, 'green'),
    timeline: timeline(id, startedAt, [
      ['培训发布', people[index % people.length], '发布培训计划和参与范围。'],
      ['签到学习', people[(index + 1) % people.length], '参训人员完成签到和课程学习。'],
      ['考试测评', people[(index + 2) % people.length], '按70分合格线完成考试测评。'],
      ['结果归档', people[index % people.length], '培训和考试结果形成项目记录。'],
    ], index % 7 === 0 ? 1 : 3),
    demo_data,
  }
})
