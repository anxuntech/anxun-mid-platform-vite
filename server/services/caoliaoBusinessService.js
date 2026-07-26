// 草料接入第二阶段：把真实表单识别为中台可消费的业务记录。

const normalizeText = value => (typeof value === 'string' ? value.trim().toLowerCase() : '')

const uniqueKeywords = values => [...new Set(values.filter(Boolean))]

const includesAny = (text, keywords) => {
  const normalizedText = normalizeText(text)
  const matchedKeywords = keywords.filter(keyword => normalizedText.includes(normalizeText(keyword)))
  return {
    matched: matchedKeywords.length > 0,
    matchedKeywords,
  }
}

const inspectPayloadText = payload => {
  try {
    return JSON.stringify(payload).toLowerCase()
  } catch {
    return ''
  }
}

const stringifyValue = value => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const collectFieldItems = fields => {
  if (!fields) return []

  if (Array.isArray(fields)) {
    return fields
      .filter(field => field && typeof field === 'object')
      .map(field => {
        const name = field.name || field.label || field.title || field.key || field.fieldName || field.field_name || ''
        const value = field.value ?? field.text ?? field.content ?? field.result ?? field.values ?? ''
        return {
          name: stringifyValue(name),
          value: stringifyValue(value),
          raw: field,
        }
      })
  }

  if (typeof fields === 'object') {
    return Object.entries(fields).map(([name, value]) => ({
      name: stringifyValue(name),
      value: stringifyValue(value),
      raw: value,
    }))
  }

  return []
}

const findFieldValue = (fieldItems, keywords) => {
  const item = fieldItems.find(field => keywords.some(keyword => field.name.includes(keyword)))
  return item?.value || ''
}

const collectEvidenceFiles = fieldItems => {
  const urlPattern = /https?:\/\/[^\s"'，,]+/g
  return fieldItems.flatMap(field => {
    const text = `${field.name} ${field.value}`
    const urls = text.match(urlPattern) || []
    return urls.map((url, index) => ({
      title: field.name || `现场证据 ${index + 1}`,
      url,
    }))
  })
}

const getFormContext = payload => {
  const refData = payload?.ref_data || payload?.refData || {}
  const form = refData?.form || {}
  const fields = refData?.fields || payload?.fields || payload?.data || payload?.form_data || payload?.formData
  const fieldItems = collectFieldItems(fields)
  const fieldSearchText = fieldItems.map(field => `${field.name} ${field.value}`).join(' | ')

  const formName = form?.name || payload?.form_name || payload?.formName || payload?.title || ''
  const formNumber = form?.number || payload?.form_number || payload?.formNumber || ''
  const serialNumber =
    refData?.serial_number ||
    refData?.serialNumber ||
    payload?.serial_number ||
    payload?.serialNumber ||
    payload?.formSerialNumber ||
    ''
  const directType = normalizeText(payload?.formType || payload?.form_type || payload?.bizType || payload?.biz_type)
  const sourceCompanyKey =
    refData?.company_id ||
    refData?.companyId ||
    payload?.company_id ||
    payload?.companyId ||
    payload?.enterprise_id ||
    payload?.enterpriseId ||
    ''
  const partitionId =
    refData?.partition_id ||
    refData?.partitionId ||
    payload?.partition_id ||
    payload?.partitionId ||
    ''

  return {
    formName,
    formNumber,
    serialNumber,
    sourceCompanyKey,
    partitionId,
    directType,
    payloadText: inspectPayloadText(payload),
    fieldItems,
    fieldSearchText,
  }
}

const hazardKeywords = ['隐患', '整改问题', '风险上报', 'hazard']
const knownHazardFormNumbers = ['D159']
const knownRectificationFormNumbers = ['D160']
const knownServiceRecordFormMap = {
  D105: '灭火器检查',
  D107: '室内消火栓检查',
  D108: '设备每日清洁卫生',
  D110: '设备点检记录',
  D111: '设备点检记录',
  D112: '故障报修记录',
}
const knownServiceRecordFormNumbers = Object.keys(knownServiceRecordFormMap)
const serviceRecordFormKeywords = ['检查', '点检', '巡检', '清洁', '卫生', '报修', '维修', '机械设备', '灭火器', '消火栓', '消防设备', '器材检查']
const serviceRecordFieldKeywords = [
  '检查结果',
  '点检结果',
  '清洁结果',
  '卫生情况',
  '报修内容',
  '故障描述',
  '维修结果',
  '设备类型',
  '机械设备',
  '灭火器',
  '消火栓',
  '压力',
  '铅封',
  '有效期',
  '外观',
  '是否正常',
]
const taskKeywords = ['任务执行', '任务反馈', '任务回执', '整改回执']

export const identifyFormBranch = payload => {
  const context = getFormContext(payload)
  const normalizedFormNumber = normalizeText(context.formNumber).toUpperCase()

  if (knownHazardFormNumbers.includes(normalizedFormNumber)) {
    return {
      branch: 'hazard',
      identifyReason: 'matched-form-number',
      matchedKeywords: [normalizedFormNumber],
      ...context,
    }
  }

  if (knownServiceRecordFormNumbers.includes(normalizedFormNumber) || knownRectificationFormNumbers.includes(normalizedFormNumber)) {
    return {
      branch: 'serviceRecord',
      identifyReason: 'matched-form-number',
      matchedKeywords: [normalizedFormNumber],
      ...context,
    }
  }

  const hazardDirectMatch = context.directType.includes('hazard') || context.directType.includes('隐患')
  const hazardFormMatch = includesAny(context.formName, hazardKeywords)
  const hazardPayloadMatch = includesAny(context.payloadText, hazardKeywords)

  if (hazardDirectMatch || hazardFormMatch.matched || hazardPayloadMatch.matched) {
    return {
      branch: 'hazard',
      identifyReason: hazardDirectMatch ? 'matched-direct-type' : 'matched-hazard-keywords',
      matchedKeywords: uniqueKeywords([
        ...(hazardDirectMatch ? ['hazard-direct-type'] : []),
        ...hazardFormMatch.matchedKeywords,
        ...hazardPayloadMatch.matchedKeywords,
      ]),
      ...context,
    }
  }

  const serviceFormMatch = includesAny(context.formName, serviceRecordFormKeywords)
  const serviceFieldMatch = includesAny(context.fieldSearchText, serviceRecordFieldKeywords)
  const serviceDirectMatch =
    context.directType.includes('service') ||
    context.directType.includes('服务') ||
    context.directType.includes('record') ||
    context.directType.includes('inspection') ||
    context.directType.includes('check')
  const serviceNumberMatch = false

  if (serviceFormMatch.matched || serviceFieldMatch.matched || serviceDirectMatch || serviceNumberMatch) {
    return {
      branch: 'serviceRecord',
      identifyReason: serviceNumberMatch
        ? 'matched-form-number'
        : serviceFormMatch.matched
          ? 'matched-form-name-keywords'
          : serviceFieldMatch.matched
            ? 'matched-field-keywords'
            : 'matched-direct-type',
      matchedKeywords: uniqueKeywords([...(serviceDirectMatch ? ['service-direct-type'] : []), ...serviceFormMatch.matchedKeywords, ...serviceFieldMatch.matchedKeywords]),
      ...context,
    }
  }

  if (
    context.directType.includes('workpermit') ||
    context.directType.includes('work_permit') ||
    context.directType.includes('permit') ||
    context.payloadText.includes('workpermit') ||
    context.payloadText.includes('work_permit') ||
    context.payloadText.includes('作业票')
  ) {
    return {
      branch: 'workPermit',
      identifyReason: 'matched-work-permit-keywords',
      matchedKeywords: ['workPermit'],
      ...context,
    }
  }

  if (
    context.directType.includes('training') ||
    context.directType.includes('exam') ||
    context.directType.includes('trainingexam') ||
    context.payloadText.includes('training_exam') ||
    context.payloadText.includes('trainingexam') ||
    context.payloadText.includes('培训') ||
    context.payloadText.includes('考试')
  ) {
    return {
      branch: 'trainingExam',
      identifyReason: 'matched-training-exam-keywords',
      matchedKeywords: ['trainingExam'],
      ...context,
    }
  }

  const taskFormMatch = includesAny(context.formName, taskKeywords)
  const taskPayloadMatch = includesAny(context.payloadText, taskKeywords)

  if (taskFormMatch.matched || taskPayloadMatch.matched) {
    return {
      branch: 'task',
      identifyReason: 'matched-task-keywords',
      matchedKeywords: uniqueKeywords([...taskFormMatch.matchedKeywords, ...taskPayloadMatch.matchedKeywords]),
      ...context,
    }
  }

  return {
    branch: 'unknown',
    identifyReason: 'no-rule-matched',
    matchedKeywords: [],
    ...context,
  }
}

const getSubmittedAt = payload =>
  payload?.submittedAt ||
  payload?.submitTime ||
  payload?.submit_time ||
  payload?.createdAt ||
  payload?.create_time ||
  payload?.ref_data?.submit_time ||
  payload?.ref_data?.submittedAt ||
  new Date().toISOString()

const inferEnterpriseNameFromFormName = formName => {
  if (!formName) return ''
  const normalized = String(formName).trim()
  const match = normalized.match(/^(.+?)(?:灭火器|消火栓|消防设备|器材|安全|隐患|巡检|点检|检查|自查|复查)/)
  return (match?.[1] || '').trim()
}

const getEnterpriseName = (payload, fieldItems, formName = '') =>
  findFieldValue(fieldItems, ['企业名称', '单位名称', '公司名称', '企业', '单位']) ||
  payload?.enterpriseName ||
  payload?.enterprise_name ||
  payload?.data?.enterpriseName ||
  inferEnterpriseNameFromFormName(formName) ||
  '未识别企业'

const getExecutor = (payload, fieldItems) =>
  findFieldValue(fieldItems, ['检查人', '点检人', '执行人', '填报人', '提交人']) ||
  payload?.submitter ||
  payload?.operator ||
  payload?.user?.name ||
  '草料表单提交人'

const getResultSummary = (payload, fieldItems, fallback) =>
  findFieldValue(fieldItems, ['检查结果', '点检结果', '处理结果', '结果', '备注', '说明', '是否正常']) ||
  payload?.summary ||
  payload?.title ||
  fallback

const buildBaseRecord = (payload, identifyContext) => {
  const fieldItems = identifyContext?.fieldItems || []
  const formName = identifyContext?.formName || payload?.formName || payload?.form_name || ''

  return {
    requestSource: 'caoliao',
    formName,
    formNumber: identifyContext?.formNumber || '',
    serialNumber: identifyContext?.serialNumber || '',
    sourceCompanyKey: identifyContext?.sourceCompanyKey || '',
    partitionId: identifyContext?.partitionId || '',
    enterpriseName: getEnterpriseName(payload, fieldItems, formName),
    submittedAt: getSubmittedAt(payload),
    executor: getExecutor(payload, fieldItems),
    rawFields: fieldItems.map(field => ({ name: field.name, value: field.value })),
    evidenceFiles: collectEvidenceFiles(fieldItems),
  }
}

export const processTaskForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered task form branch')
  const base = buildBaseRecord(payload, identifyContext)
  return {
    formType: 'task',
    recognized: true,
    summary: getResultSummary(payload, identifyContext.fieldItems, base.formName || '任务回传'),
    identifyReason: identifyContext?.identifyReason || 'matched-task-keywords',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    ...base,
  }
}

export const processHazardForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered hazard form branch')
  const base = buildBaseRecord(payload, identifyContext)
  const fieldItems = identifyContext?.fieldItems || []
  return {
    formType: 'hazard',
    recognized: true,
    hazardName: payload?.hazardName || findFieldValue(fieldItems, ['隐患名称', '问题名称', '风险点']) || base.formName || '草料隐患上报',
    hazardLevel: payload?.hazardLevel || findFieldValue(fieldItems, ['隐患等级', '风险等级', '严重程度']) || '待判定',
    status: payload?.status || findFieldValue(fieldItems, ['状态', '处理进度', '整改情况', '复查情况']) || '',
    responsiblePerson: payload?.responsiblePerson || findFieldValue(fieldItems, ['责任人', '整改人']) || '',
    rectificationDeadline: payload?.rectificationDeadline || findFieldValue(fieldItems, ['整改期限', '完成期限', '截止时间']) || '',
    rectifiedAt: findFieldValue(fieldItems, ['整改时间', '整改完成时间']) || '',
    closedAt: findFieldValue(fieldItems, ['闭环时间', '销号时间', '复查通过时间']) || '',
    summary: getResultSummary(payload, fieldItems, base.formName || '隐患上报'),
    identifyReason: identifyContext?.identifyReason || 'matched-hazard-keywords',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    ...base,
  }
}

export const processServiceRecordForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered service record branch')
  const base = buildBaseRecord(payload, identifyContext)
  const fieldItems = identifyContext?.fieldItems || []
  return {
    formType: 'serviceRecord',
    recognized: true,
    serviceType:
      payload?.serviceType ||
      knownServiceRecordFormMap[String(base.formNumber || '').toUpperCase()] ||
      (knownRectificationFormNumbers.includes(String(base.formNumber || '').toUpperCase()) ? '整改反馈' : '') ||
      findFieldValue(fieldItems, ['服务类型', '培训主题', '检查类型', '点检类型', '设备类型']) ||
      (base.formName.includes('灭火器') || base.formName.includes('消火栓') ? '消防设备点检' : base.formName.includes('机械设备') ? '机械设备检查' : base.formName || '现场检查'),
    resultSummary: payload?.resultSummary || getResultSummary(payload, fieldItems, base.formName || '服务记录回传'),
    recordStatus: payload?.status || payload?.recordStatus || '已回传',
    identifyReason: identifyContext?.identifyReason || 'matched-service-record-keywords',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    ...base,
  }
}

export const processWorkPermitForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered work permit branch')
  const base = buildBaseRecord(payload, identifyContext)
  const fieldItems = identifyContext?.fieldItems || []
  return {
    formType: 'workPermit',
    recognized: true,
    permitType: payload?.permitType || findFieldValue(fieldItems, ['作业类型', '作业票类型', '特殊作业']) || base.formName || '作业票',
    location: payload?.location || findFieldValue(fieldItems, ['作业地点', '动火地点', '部位', '地点']) || '',
    permitStatus: payload?.status || findFieldValue(fieldItems, ['状态', '处理进度', '审批状态']) || '待审批',
    applicant: payload?.applicant || findFieldValue(fieldItems, ['申请人', '作业负责人', '填报人', '姓名']) || base.executor,
    plannedStart: payload?.plannedStart || findFieldValue(fieldItems, ['计划开始时间', '作业开始时间', '开始时间']) || '',
    plannedEnd: payload?.plannedEnd || findFieldValue(fieldItems, ['计划结束时间', '作业结束时间', '结束时间']) || '',
    guardian: payload?.guardian || findFieldValue(fieldItems, ['监护人', '现场监护']) || '',
    completedAt: payload?.completedAt || findFieldValue(fieldItems, ['完成时间', '作业完成时间']) || '',
    summary: getResultSummary(payload, fieldItems, base.formName || '作业票记录'),
    identifyReason: identifyContext?.identifyReason || 'matched-work-permit',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    ...base,
  }
}

export const processTrainingExamForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered training exam branch')
  const base = buildBaseRecord(payload, identifyContext)
  const fieldItems = identifyContext?.fieldItems || []
  return {
    formType: 'trainingExam',
    recognized: true,
    personName: payload?.personName || findFieldValue(fieldItems, ['姓名', '人员', '学员']) || base.executor,
    courseName: payload?.courseName || findFieldValue(fieldItems, ['课程', '培训', '考试']) || base.formName || '培训考试',
    trainingStatus: payload?.status || findFieldValue(fieldItems, ['完成状态', '状态']) || '已完成',
    examResult: payload?.examResult || findFieldValue(fieldItems, ['考试结果', '结果']) || '合格',
    score: Number(payload?.score || findFieldValue(fieldItems, ['得分', '分数', '成绩']) || 0),
    trainingMethod: payload?.trainingMethod || findFieldValue(fieldItems, ['培训方式', '学习方式']) || '',
    startedAt: payload?.startedAt || findFieldValue(fieldItems, ['开始时间', '培训开始时间']) || '',
    endedAt: payload?.endedAt || findFieldValue(fieldItems, ['完成时间', '结束时间', '考试时间']) || base.submittedAt,
    summary: getResultSummary(payload, fieldItems, base.formName || '培训考试记录'),
    identifyReason: identifyContext?.identifyReason || 'matched-training-exam',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    ...base,
  }
}

export const dispatchBusinessProcess = async payload => {
  const identifyContext = identifyFormBranch(payload)

  if (identifyContext.branch === 'hazard') return processHazardForm(payload, identifyContext)
  if (identifyContext.branch === 'serviceRecord') return processServiceRecordForm(payload, identifyContext)
  if (identifyContext.branch === 'workPermit') return processWorkPermitForm(payload, identifyContext)
  if (identifyContext.branch === 'trainingExam') return processTrainingExamForm(payload, identifyContext)
  if (identifyContext.branch === 'task') return processTaskForm(payload, identifyContext)

  console.log('[caoliao] form type not recognized, fallback to unknown branch')
  return {
    formType: 'unknown',
    recognized: false,
    summary: '草料表单暂未匹配到中台业务分支',
    identifyReason: identifyContext.identifyReason,
    matchedKeywords: identifyContext.matchedKeywords,
    formName: identifyContext.formName,
    formNumber: identifyContext.formNumber,
    serialNumber: identifyContext.serialNumber,
  }
}
