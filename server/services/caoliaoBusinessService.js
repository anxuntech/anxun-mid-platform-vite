// Phase 1 of Caoliao integration: keep recognition, routing and traceable logs lightweight.

const normalizeText = value => (typeof value === 'string' ? value.trim().toLowerCase() : '')

const uniqueKeywords = values => [...new Set(values.filter(Boolean))]

const includesAny = (text, keywords) => {
  const matchedKeywords = keywords.filter(keyword => text.includes(keyword.toLowerCase()))
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

const collectFieldTexts = fields => {
  if (!fields) return []

  if (Array.isArray(fields)) {
    return fields.flatMap(field => {
      if (!field || typeof field !== 'object') return []

      const values = [
        field.name,
        field.label,
        field.title,
        field.key,
        field.fieldName,
        field.field_name,
        field.value,
        field.text,
        field.content,
        field.result,
      ]

      return values.filter(item => typeof item === 'string' && item.trim())
    })
  }

  if (typeof fields === 'object') {
    return Object.entries(fields).flatMap(([key, value]) => {
      const collected = [key]

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        collected.push(String(value))
      } else if (value && typeof value === 'object') {
        try {
          collected.push(JSON.stringify(value))
        } catch {
          collected.push(String(value))
        }
      }

      return collected.filter(item => typeof item === 'string' && item.trim())
    })
  }

  return []
}

const getFormContext = payload => {
  const refData = payload?.ref_data || payload?.refData || {}
  const form = refData?.form || {}

  const formName = form?.name || payload?.form_name || payload?.formName || payload?.title || ''
  const formNumber = form?.number || payload?.form_number || payload?.formNumber || ''
  const serialNumber =
    refData?.serial_number || refData?.serialNumber || payload?.serial_number || payload?.serialNumber || ''
  const directType = normalizeText(payload?.formType || payload?.form_type || payload?.bizType || payload?.biz_type)
  const payloadText = inspectPayloadText(payload)
  const fieldTexts = collectFieldTexts(refData?.fields || payload?.fields || payload?.data || payload?.form_data)
  const fieldSearchText = fieldTexts.join(' | ').toLowerCase()

  return {
    formName,
    formNumber,
    serialNumber,
    directType,
    payloadText,
    fieldSearchText,
  }
}

const hazardKeywords = ['隐患', 'hazard']
const serviceRecordFormKeywords = ['检查', '点检', '巡检', '灭火器', '消火栓', '消防设备', '器材检查']
const serviceRecordFieldKeywords = ['检查结果', '点检结果', '设备类型', '灭火器', '消火栓', '压力', '铅封', '有效期', '外观', '是否正常']
const taskKeywords = ['任务执行', '任务反馈', '任务回执', '整改回执']

export const identifyFormBranch = payload => {
  const context = getFormContext(payload)
  const normalizedFormName = normalizeText(context.formName)

  const hazardDirectMatch = context.directType.includes('hazard') || context.directType.includes('隐患')
  const hazardFormMatch = includesAny(normalizedFormName, hazardKeywords)
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

  const serviceFormMatch = includesAny(normalizedFormName, serviceRecordFormKeywords)
  const serviceFieldMatch = includesAny(context.fieldSearchText, serviceRecordFieldKeywords)
  const serviceDirectMatch =
    context.directType.includes('service') ||
    context.directType.includes('服务') ||
    context.directType.includes('record') ||
    context.directType.includes('inspection') ||
    context.directType.includes('check')
  const serviceNumberMatch = normalizeText(context.formNumber) === 'd21'

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
      matchedKeywords: uniqueKeywords([
        ...(serviceNumberMatch ? ['D21'] : []),
        ...(serviceDirectMatch ? ['service-direct-type'] : []),
        ...serviceFormMatch.matchedKeywords,
        ...serviceFieldMatch.matchedKeywords,
      ]),
      ...context,
    }
  }

  const taskDirectMatch = context.directType.includes('task') || context.directType.includes('任务')
  const taskFormMatch = includesAny(normalizedFormName, taskKeywords)
  const taskPayloadMatch = includesAny(context.payloadText, taskKeywords)

  if (taskDirectMatch || taskFormMatch.matched || taskPayloadMatch.matched) {
    return {
      branch: 'task',
      identifyReason: taskDirectMatch ? 'matched-direct-type' : 'matched-task-keywords',
      matchedKeywords: uniqueKeywords([
        ...(taskDirectMatch ? ['task-direct-type'] : []),
        ...taskFormMatch.matchedKeywords,
        ...taskPayloadMatch.matchedKeywords,
      ]),
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

export const processTaskForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered task form branch')
  return {
    formType: 'task',
    recognized: true,
    summary: payload?.title || identifyContext?.formName || payload?.form_name || 'task form mapping pending',
    identifyReason: identifyContext?.identifyReason || 'matched-task-keywords',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    formName: identifyContext?.formName || '',
    formNumber: identifyContext?.formNumber || '',
    serialNumber: identifyContext?.serialNumber || '',
  }
}

export const processHazardForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered hazard form branch')
  return {
    formType: 'hazard',
    recognized: true,
    summary: payload?.title || identifyContext?.formName || payload?.form_name || 'hazard form mapping pending',
    identifyReason: identifyContext?.identifyReason || 'matched-hazard-keywords',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    formName: identifyContext?.formName || '',
    formNumber: identifyContext?.formNumber || '',
    serialNumber: identifyContext?.serialNumber || '',
  }
}

export const processServiceRecordForm = async (payload, identifyContext) => {
  console.log('[caoliao] entered service record branch')
  return {
    formType: 'serviceRecord',
    recognized: true,
    summary:
      payload?.title || identifyContext?.formName || payload?.form_name || 'service record mapping pending',
    identifyReason: identifyContext?.identifyReason || 'matched-service-record-keywords',
    matchedKeywords: identifyContext?.matchedKeywords || [],
    formName: identifyContext?.formName || '',
    formNumber: identifyContext?.formNumber || '',
    serialNumber: identifyContext?.serialNumber || '',
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
    summary: 'form type not recognized in phase 1',
    identifyReason: identifyContext.identifyReason,
    matchedKeywords: identifyContext.matchedKeywords,
    formName: identifyContext.formName,
    formNumber: identifyContext.formNumber,
    serialNumber: identifyContext.serialNumber,
  }
}
