import { createHash } from 'node:crypto'

const stableStringify = value => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export const hashPayload = payload =>
  createHash('sha256').update(stableStringify(payload ?? {})).digest('hex')

export const deriveSourceEventId = ({ payload, record, payloadHash }) => {
  const refData = payload?.ref_data || payload?.refData || {}
  const stableId =
    refData.serial_number ||
    refData.serialNumber ||
    payload?.serial_number ||
    payload?.serialNumber ||
    payload?.event_id ||
    payload?.eventId ||
    record?.serialNumber
  const formNumber = record?.formNumber || refData?.form?.number || ''
  return stableId ? `${formNumber || 'form'}:${String(stableId)}` : `sha256:${payloadHash}`
}

export const normalizeCompanyKey = value =>
  String(value || '').trim().replace(/\s+/g, '').toLowerCase()
