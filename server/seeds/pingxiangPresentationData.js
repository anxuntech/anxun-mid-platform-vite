const projectId = 'pingxiang'
const countyId = 'county-pingxiang'
const evidenceRoot = '/test-evidence/pingxiang'

const companySeeds = [
  ['兴安机械制造', '机械设备制造'], ['宏达童车配件', '童车及零部件'], ['瑞通橡塑制品', '橡胶和塑料制品'],
  ['恒泰自行车配件', '自行车零部件'], ['华盛精密轴承', '轴承制造'], ['金源塑胶制品', '塑料制品'],
  ['东升五金加工', '金属制品加工'], ['顺达仓储物流', '仓储物流'], ['新航金属制品', '金属制品加工'],
  ['永安机械设备', '专用设备制造'], ['鑫达童车制造', '童车制造'], ['宏远包装材料', '包装材料'],
  ['华诚橡塑科技', '橡胶和塑料制品'], ['嘉诚电器配件', '电气设备制造'], ['盛达精密制造', '机械设备制造'],
  ['恒信仓储服务', '仓储物流'], ['天成纺织制品', '纺织加工'], ['德润金属加工', '金属制品加工'],
  ['安泰儿童用品', '儿童用品制造'], ['联创机械科技', '机械设备制造'], ['汇鑫橡塑制品', '橡胶和塑料制品'],
  ['众诚包装制品', '包装材料'], ['华宇自行车配件', '自行车零部件'], ['瑞丰纺织加工', '纺织加工'],
  ['腾达机械制造', '机械设备制造'], ['昌盛电器设备', '电气设备制造'], ['佳和仓储服务', '仓储物流'],
  ['远航五金制品', '金属制品加工'], ['新盛塑料科技', '塑料制品'], ['鑫源儿童用品', '儿童用品制造'],
]
const people = ['张明', '刘洋', '陈静', '赵磊', '孙佳', '李娜', '周强', '王敏', '高鹏', '许蕾', '韩松', '马超']
const hazardTitles = ['配电箱周边堆放杂物', '消防通道临时占用', '灭火器点检记录缺失', '设备防护罩松动', '危化品标识不清', '临时用电线路未固定']
const hazardStatuses = ['待整改', '整改中', '待复查', '已销号', '超期未整改', '已销号']
const patrolPoints = ['生产车间东侧通道', '配电室', '消防泵房', '原料仓库', '成品装卸区', '办公楼疏散通道']
const permitTypes = ['动火作业', '有限空间作业', '高处作业', '临时用电']
const permitStatuses = ['待审批', '已通过', '已驳回', '已完成']

const pad = value => String(value).padStart(4, '0')
const dateFor = (companyIndex, itemIndex, hour) => {
  const day = 4 + ((companyIndex * 2 + itemIndex) % 23)
  return `2026-07-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${itemIndex % 2 ? '30' : '10'}:00`
}
const plusHours = (value, hours) => value.replace(/(\d{2}):(\d{2}):00$/, (_, hour, minute) => `${String(Math.min(23, Number(hour) + hours)).padStart(2, '0')}:${minute}:00`)
const evidence = (prefix, sequence, names) => names.map((name, index) => ({
  id: `${prefix}-att-${pad(sequence)}-${index + 1}`,
  name,
  url: `${evidenceRoot}/${prefix}-${index + 1}.svg`,
  contentType: 'image/svg+xml',
}))
const timeline = (prefix, sequence, occurredAt, steps, currentIndex = steps.length - 1) => steps.map((step, index) => ({
  id: `${prefix}-timeline-${pad(sequence)}-${index + 1}`,
  title: step[0],
  person: step[1],
  time: index <= currentIndex ? plusHours(occurredAt, index * 2) : '待完成',
  note: step[2],
  status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending',
}))

export const buildPingxiangPresentationSeed = () => {
  const companies = companySeeds.map(([name, industry], index) => ({
    companyId: `px-company-${String(index + 1).padStart(3, '0')}`,
    companyName: `平乡县${name}有限公司`,
    industry,
    address: `平乡县${['工业聚集区', '河古庙镇产业园', '节固镇工业园', '城东装备制造园'][index % 4]} ${index + 1}号`,
    contactName: people[index % people.length],
    contactPhone: `1380001${String(index + 1).padStart(4, '0')}`,
    enabledAt: `2026-01-${String(3 + (index % 22)).padStart(2, '0')} 09:00:00`,
  }))

  const hazards = companies.slice(0, 24).flatMap((company, companyIndex) =>
    Array.from({ length: companyIndex < 12 ? 3 : 2 }, (_, itemIndex) => {
      const sequence = companyIndex < 12 ? companyIndex * 3 + itemIndex + 1 : 36 + (companyIndex - 12) * 2 + itemIndex + 1
      const sourceRecordId = `PX-YH-${pad(sequence)}`
      const occurredAt = dateFor(companyIndex, itemIndex, 9)
      const status = hazardStatuses[(sequence - 1) % hazardStatuses.length]
      const rectified = ['整改中', '待复查', '已销号'].includes(status)
      const closed = status === '已销号'
      const currentIndex = closed ? 4 : status === '待复查' ? 3 : rectified ? 2 : 1
      const title = hazardTitles[(sequence - 1) % hazardTitles.length]
      return {
        kind: 'hazard',
        sequence,
        sourceRecordId,
        company,
        title,
        summary: `${title}，现场状态不符合企业安全管理要求，已纳入整改闭环。`,
        status,
        occurredAt,
        specialized: {
          description: `${title}。检查人员现场核实后完成位置、问题表现和整改要求登记。`,
          level: sequence % 5 === 0 ? '高' : sequence % 3 === 0 ? '中' : '低',
          reporter: people[sequence % people.length],
          assignee: people[(sequence + 2) % people.length],
          deadline: `2026-07-${String(Math.min(28, 11 + ((sequence - 1) % 17))).padStart(2, '0')} 18:00:00`,
          rectifiedAt: rectified ? plusHours(occurredAt, 5) : null,
          closedAt: closed ? plusHours(occurredAt, 7) : null,
        },
        attachments: [
          ...evidence('hazard-site', sequence, ['隐患现场全景（测试资料）', '问题部位近景（测试资料）']),
          ...(rectified ? evidence('hazard-fixed', sequence, ['整改后现场（测试资料）', '整改措施确认（测试资料）']) : []),
        ],
        detail: {
          rectification_content: rectified ? '已清理现场、恢复安全间距并设置责任区域标识，由班组负责人完成自查。' : '待责任人按整改要求完成现场处理并提交证据。',
          reviewer: currentIndex >= 3 ? people[(sequence + 4) % people.length] : '',
          review_opinion: currentIndex >= 3 ? '整改措施落实，现场状态符合本次复查要求。' : '',
          linked_patrol_source_id: `PX-XJ-${pad(Math.min(60, sequence))}`,
          timeline: timeline('hazard', sequence, occurredAt, [
            ['隐患上报', people[sequence % people.length], '完成问题描述、位置和现场照片登记。'],
            ['责任分派', people[(sequence + 1) % people.length], '明确整改责任人与完成期限。'],
            ['整改提交', people[(sequence + 2) % people.length], '提交整改说明和整改后照片。'],
            ['复查确认', people[(sequence + 4) % people.length], '核验整改措施和现场状态。'],
            ['销号归档', people[(sequence + 4) % people.length], '完成闭环归档并保留过程证据。'],
          ], currentIndex),
        },
      }
    }))

  const inspections = companies.slice(0, 24).flatMap((company, companyIndex) =>
    Array.from({ length: companyIndex < 12 ? 3 : 2 }, (_, itemIndex) => {
      const sequence = companyIndex < 12 ? companyIndex * 3 + itemIndex + 1 : 36 + (companyIndex - 12) * 2 + itemIndex + 1
      const sourceRecordId = `PX-XJ-${pad(sequence)}`
      const occurredAt = dateFor(companyIndex, itemIndex, 10)
      const abnormal = sequence % 4 === 0
      const missing = sequence % 17 === 0
      const status = missing ? '漏检' : abnormal ? '异常' : '正常'
      const items = ['通道畅通情况', '消防设施状态', '用电设备状态', '设备防护装置', '现场物料摆放', '安全标识状态'].map((name, index) => ({
        id: `${sourceRecordId}-item-${index + 1}`,
        name,
        result: missing && index === 5 ? '未提供' : abnormal && index === 1 ? '异常' : '正常',
        note: abnormal && index === 1 ? '现场状态异常，已转入隐患闭环。' : '检查结果符合要求。',
      }))
      return {
        kind: 'inspection',
        sequence,
        sourceRecordId,
        company,
        title: `${company.industry}日常巡检`,
        summary: missing ? '本次巡检存在未完成检查项。' : abnormal ? '发现1项现场问题，已关联隐患跟进。' : '本次检查项目均正常。',
        status,
        occurredAt,
        specialized: {
          inspectionType: `${company.industry}日常巡检`,
          pointName: patrolPoints[(sequence - 1) % patrolPoints.length],
          inspector: people[(sequence + 1) % people.length],
          itemCount: items.length,
          abnormalCount: abnormal ? 1 : 0,
          result: missing ? '存在漏检项，需补检' : abnormal ? '发现问题并已上报' : '检查正常',
          linkedHazardSourceId: abnormal ? hazards.find(item => item.company.companyId === company.companyId)?.sourceRecordId || '' : '',
        },
        attachments: evidence('inspection', sequence, ['巡检点位全景（测试资料）', '检查项目照片（测试资料）']),
        detail: {
          items,
          qr_code: `PX-POINT-${String((sequence % 40) + 1).padStart(3, '0')}`,
          planned_count: 6,
          completed_count: missing ? 5 : 6,
          timeline: timeline('inspection', sequence, occurredAt, [
            ['扫码到达', people[(sequence + 1) % people.length], '识别现场二维码和巡检点位。'],
            ['逐项检查', people[(sequence + 1) % people.length], '完成检查项、备注和现场照片填报。'],
            ['结果提交', people[(sequence + 1) % people.length], abnormal ? '问题项已转入隐患闭环。' : '本次巡检结果已归档。'],
          ]),
        },
      }
    }))

  const permits = companies.slice(0, 24).map((company, index) => {
    const sequence = index + 1
    const sourceRecordId = `PX-ZY-${pad(sequence)}`
    const occurredAt = dateFor(index, 1, 8)
    const status = permitStatuses[index % permitStatuses.length]
    const approved = ['已通过', '已完成'].includes(status)
    return {
      kind: 'work_permit',
      sequence,
      sourceRecordId,
      company,
      title: permitTypes[index % permitTypes.length],
      summary: status === '已驳回' ? '隔离措施不完整，已退回补充。' : approved ? '作业条件和安全措施已核验。' : '等待安全管理人员审批。',
      status,
      occurredAt,
      specialized: {
        permitType: permitTypes[index % permitTypes.length],
        applicant: people[index % people.length],
        location: ['焊接区', '污水池', '成品库屋面', '设备维修间'][index % 4],
        plannedStart: plusHours(occurredAt, 1),
        plannedEnd: plusHours(occurredAt, 9),
        guardian: people[(index + 4) % people.length],
        completedAt: status === '已完成' ? plusHours(occurredAt, 9) : null,
      },
      attachments: evidence('permit', sequence, ['作业区域照片（测试资料）', '安全交底记录（测试资料）']),
      detail: {
        approvals: [
          { role: '班组负责人', person: people[(index + 1) % people.length], status: '已通过', time: occurredAt, opinion: '作业条件已核对。' },
          { role: '安全管理人员', person: people[(index + 2) % people.length], status: status === '已驳回' ? '已驳回' : approved ? '已通过' : '待审批', time: approved ? plusHours(occurredAt, 1) : '', opinion: status === '已驳回' ? '请补充隔离措施后重新申请。' : approved ? '安全措施符合要求。' : '等待审批。' },
        ],
        measures: ['作业区域完成隔离', '消防器材配置到位', '作业人员完成安全交底', '监护人员全程在岗'].map((content, measureIndex) => ({
          id: `${sourceRecordId}-measure-${measureIndex + 1}`,
          content,
          confirmed: status !== '待审批' && !(status === '已驳回' && measureIndex === 0),
        })),
        timeline: timeline('permit', sequence, occurredAt, [
          ['提交申请', people[index % people.length], '提交作业范围、人员和安全措施。'],
          ['现场核验', people[(index + 1) % people.length], '核验作业条件和隔离措施。'],
          ['安全审批', people[(index + 2) % people.length], status === '已驳回' ? '申请退回补充。' : approved ? '审批通过。' : '等待审批。'],
          ['完工确认', people[(index + 4) % people.length], status === '已完成' ? '现场清理完毕，作业票归档。' : '待作业结束后确认。'],
        ], status === '已完成' ? 3 : approved || status === '已驳回' ? 2 : 1),
      },
    }
  })

  const trainings = companies.slice(0, 24).map((company, index) => {
    const sequence = index + 1
    const sourceRecordId = `PX-PX-${pad(sequence)}`
    const occurredAt = dateFor(index, 1, 14)
    const participantCount = 8 + (index % 5)
    const participants = Array.from({ length: participantCount }, (_, participantIndex) => {
      const completed = participantIndex < participantCount - (index % 4 === 0 ? 1 : 0)
      const score = completed ? 68 + ((index * 7 + participantIndex * 5) % 31) : null
      return {
        id: `${sourceRecordId}-person-${participantIndex + 1}`,
        name: people[(index + participantIndex) % people.length],
        joined_at: plusHours(occurredAt, 0),
        completed,
        score,
        passed: score === null ? null : score >= 70,
      }
    })
    const passed = participants.filter(item => item.passed).length
    return {
      kind: 'training',
      sequence,
      sourceRecordId,
      company,
      title: index % 2 === 0 ? '企业现场隐患辨识与闭环培训' : '消防设施点检实操培训',
      summary: `本次培训共${participantCount}人参与，${passed}人考试合格，签到和考试结果已归档。`,
      status: index % 7 === 0 ? '进行中' : '已完成',
      occurredAt,
      specialized: {
        participantName: people[index % people.length],
        method: index % 3 === 0 ? '线下集中培训' : '现场实操培训',
        startedAt: occurredAt,
        endedAt: index % 7 === 0 ? null : plusHours(occurredAt, 2),
        score: Math.round(participants.filter(item => item.score !== null).reduce((sum, item) => sum + item.score, 0) / Math.max(1, participants.filter(item => item.score !== null).length)),
        passed: passed === participants.filter(item => item.score !== null).length,
      },
      attachments: evidence('training', sequence, ['培训现场照片（测试资料）', '签到与考试记录（测试资料）']),
      detail: {
        participants,
        exam_pass_score: 70,
        timeline: timeline('training', sequence, occurredAt, [
          ['培训发布', people[index % people.length], '发布培训计划和参与范围。'],
          ['签到学习', people[(index + 1) % people.length], '参训人员完成签到和课程学习。'],
          ['考试测评', people[(index + 2) % people.length], '按70分合格线完成考试测评。'],
          ['结果归档', people[index % people.length], '培训签到、成绩和附件已归档。'],
        ], index % 7 === 0 ? 1 : 3),
      },
    }
  })

  return {
    projectId,
    countyId,
    companies,
    records: [...hazards, ...inspections, ...permits, ...trainings],
  }
}
