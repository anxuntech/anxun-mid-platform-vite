import { getRuntimeConfig } from '../config/runtimeConfig.js'
import {
  findConnector,
  markWebhookEventFailed,
  saveRawWebhookEvent,
  standardizeWebhookEvent,
} from '../repositories/mysqlBusinessRepository.js'
import { deriveSourceEventId, hashPayload } from './eventIdentity.js'

const redactHeaders = headers => {
  const safe = { ...(headers || {}) }
  for (const key of Object.keys(safe)) {
    if (/authorization|cookie|secret|token|key/i.test(key)) safe[key] = '[REDACTED]'
  }
  return safe
}

export const saveMysqlRawEvent = async ({
  requestId,
  receivedAt,
  headers,
  payload,
  rawBody = '',
  parseError = '',
  record,
  connectorKey,
}) => {
  const selectedConnector = connectorKey || getRuntimeConfig().caoliaoConnectorKey
  const connector = await findConnector(selectedConnector)
  if (!connector) throw new Error(`source-connector-not-found:${selectedConnector}`)
  if (!connector.enabled) throw new Error(`source-connector-disabled:${selectedConnector}`)
  if (!connector.project_id) throw new Error(`source-connector-project-not-configured:${selectedConnector}`)

  const payloadHash = hashPayload(parseError ? { rawBody } : payload)
  const sourceEventId = deriveSourceEventId({ payload, record, payloadHash })
  const rawEvent = await saveRawWebhookEvent({
    connector,
    sourceEventId,
    requestId,
    receivedAt,
    payload,
    rawBody,
    parseError,
    payloadHash,
    headers: redactHeaders(headers),
  })
  return { connector, rawEvent, sourceEventId }
}

export const standardizeMysqlRawEvent = async ({ connector, rawEvent, sourceEventId, record }) => {
  if (rawEvent.duplicate) {
    return {
      status: 'duplicate',
      eventId: rawEvent.eventId,
      sourceEventId,
      parseStatus: rawEvent.parseStatus,
    }
  }

  const standardized = await standardizeWebhookEvent({
    eventId: rawEvent.eventId,
    connector,
    sourceEventId,
    record,
  })
  return {
    ...standardized,
    eventId: rawEvent.eventId,
    sourceEventId,
  }
}

export const failMysqlRawEvent = async (rawEventContext, error) => {
  if (!rawEventContext || rawEventContext.rawEvent.duplicate) return
  await markWebhookEventFailed(rawEventContext.rawEvent.eventId, error)
}

export const ingestMysqlEvent = async input => {
  const rawEventContext = await saveMysqlRawEvent(input)
  return standardizeMysqlRawEvent({ ...rawEventContext, record: input.record })
}
