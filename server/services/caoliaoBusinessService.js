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

  return {
    formName,
    formNumber,
    serialNumber,
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
    hazardName: findFieldValue(fieldItems, ['隐患名称', '问题名称', '风险点']) || base.formName || '草料隐患上报',
    hazardLevel: findFieldValue(fieldItems, ['隐患等级', '风险等级', '严重程度']) || '待判定',
    responsiblePerson: findFieldValue(fieldItems, ['责任人', '整改人']) || '',
    rectificationDeadline: findFieldValue(fieldItems, ['整改期限', '完成期限', '截止时间']) || '',
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
      knownServiceRecordFormMap[String(base.formNumber || '').toUpperCase()] ||
      (knownRectificationFormNumbers.includes(String(base.formNumber || '').toUpperCase()) ? '整改反馈' : '') ||
      findFieldValue(fieldItems, ['服务类型', '培训主题', '检查类型', '点检类型', '设备类型']) ||
      (base.formName.includes('灭火器') || base.formName.includes('消火栓') ? '消防设备点检' : base.formName.includes('机械设备') ? '机械设备检查' : base.formName || '现场检查'),
    resultSummary: getResultSummary(payload, fieldItems, base.formName || '服务记录回传'),
    recordStatus: '已回传',
    identifyReason: identifyContext?.identifyReason || 'matched-service-record-keywords',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    ...base,
  }
}

export const dispatchBusinessProcess = async payload => {
  const identifyContext = identifyFormBranch(payload)

  if (identifyContext.branch === 'hazard') return processHazardForm(payload, identifyContext)
  if (identifyContext.branch === 'serviceRecord') return processServiceRecordForm(payload, identifyContext)
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
