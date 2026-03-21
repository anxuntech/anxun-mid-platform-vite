// Phase 1 of Caoliao integration: only keep form recognition and service entry points.

const normalizeText = value => (typeof value === 'string' ? value.trim().toLowerCase() : '')

const inspectPayloadText = payload => {
  try {
    return JSON.stringify(payload).toLowerCase()
  } catch {
    return ''
  }
}

export const detectFormType = payload => {
  const directType = normalizeText(payload?.formType || payload?.form_type || payload?.bizType || payload?.biz_type)
  if (directType.includes('task') || directType.includes('任务')) return 'task'
  if (directType.includes('hazard') || directType.includes('隐患')) return 'hazard'
  if (directType.includes('service') || directType.includes('服务') || directType.includes('record')) return 'serviceRecord'

  const payloadText = inspectPayloadText(payload)
  if (payloadText.includes('隐患')) return 'hazard'
  if (payloadText.includes('巡检') || payloadText.includes('培训') || payloadText.includes('复查') || payloadText.includes('服务记录')) return 'serviceRecord'
  if (payloadText.includes('任务')) return 'task'
  return 'unknown'
}

export const processTaskForm = async payload => {
  console.log('[caoliao] entered task form branch')
  return {
    formType: 'task',
    recognized: true,
    summary: payload?.title || payload?.form_name || 'task form mapping pending',
  }
}

export const processHazardForm = async payload => {
  console.log('[caoliao] entered hazard form branch')
  return {
    formType: 'hazard',
    recognized: true,
    summary: payload?.title || payload?.form_name || 'hazard form mapping pending',
  }
}

export const processServiceRecordForm = async payload => {
  console.log('[caoliao] entered service record branch')
  return {
    formType: 'serviceRecord',
    recognized: true,
    summary: payload?.title || payload?.form_name || 'service record mapping pending',
  }
}

export const dispatchBusinessProcess = async payload => {
  const detectedType = detectFormType(payload)

  if (detectedType === 'task') return processTaskForm(payload)
  if (detectedType === 'hazard') return processHazardForm(payload)
  if (detectedType === 'serviceRecord') return processServiceRecordForm(payload)

  console.log('[caoliao] form type not recognized, fallback to unknown branch')
  return {
    formType: 'unknown',
    recognized: false,
    summary: 'form type not recognized in phase 1',
  }
}
