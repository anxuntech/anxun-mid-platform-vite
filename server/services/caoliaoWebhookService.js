import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { writeWebhookLog } from '../utils/fileLogger.js'
import { dispatchBusinessProcess } from './caoliaoBusinessService.js'
import { appendBusinessEvent } from './caoliaoDataStore.js'
import {
  failMysqlRawEvent,
  saveMysqlRawEvent,
  standardizeMysqlRawEvent,
} from './mysqlEventIngestService.js'

const redactHeaders = headers =>
  Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [
      key,
      /authorization|cookie|secret|token|key/i.test(key) ? '[REDACTED]' : value,
    ]),
  )

const safeWriteWebhookLog = async entry => {
  try {
    await writeWebhookLog(entry)
    return true
  } catch (error) {
    console.error(
      `[caoliao] audit log write failed requestId=${entry.requestId || 'unknown'}`,
      error,
    )
    return false
  }
}

export const processCaoliaoWebhook = async ({
  headers,
  rawBody,
  parsedBody,
  parseError = '',
  auth = { accepted: true },
}) => {
  const receivedAt = new Date().toISOString()
  const requestId = `caoliao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const safeHeaders = redactHeaders(headers)

  if (!auth.accepted) {
    await safeWriteWebhookLog({
      requestId,
      source: 'caoliao',
      receivedAt,
      headers: safeHeaders,
      processStatus: 'rejected',
      errorMessage: auth.reason || 'webhook-auth-failed',
    })
    console.warn(`[caoliao] webhook rejected requestId=${requestId} reason=${auth.reason}`)
    return { success: true, message: 'received' }
  }

  const runtimeConfig = getRuntimeConfig()
  let rawMysqlEvent
  let mysqlStatus = runtimeConfig.mysqlWriteEnabled ? 'pending' : 'disabled'
  const failures = []

  if (runtimeConfig.mysqlWriteEnabled) {
    try {
      rawMysqlEvent = await saveMysqlRawEvent({
        requestId,
        receivedAt,
        headers: safeHeaders,
        payload: parsedBody,
        rawBody,
        parseError,
      })
      mysqlStatus = rawMysqlEvent.rawEvent.duplicate ? 'duplicate' : 'raw-written'
    } catch (error) {
      mysqlStatus = 'failed'
      failures.push(`mysql-raw:${error.message}`)
    }
  }

  try {
    const result = await dispatchBusinessProcess(parsedBody)
    const identifyTrace = {
      requestId,
      formName: result.formName || '',
      formNumber: result.formNumber || '',
      serialNumber: result.serialNumber || '',
      branch: result.formType,
      identifyReason: result.identifyReason || '',
      matchedKeywords: result.matchedKeywords || [],
    }
    console.log(`[caoliao] identify ${JSON.stringify(identifyTrace)}`)

    let jsonlStatus = 'written'
    let mysqlResult

    try {
      await appendBusinessEvent({
        requestId,
        source: 'caoliao',
        sourceEnvironment: runtimeConfig.caoliaoSourceEnvironment,
        receivedAt,
        branch: result.formType,
        recognized: result.recognized,
        identifyTrace,
        record: result,
      })
    } catch (error) {
      jsonlStatus = 'failed'
      failures.push(`jsonl:${error.message}`)
    }

    if (rawMysqlEvent) {
      try {
        mysqlResult = await standardizeMysqlRawEvent({
          ...rawMysqlEvent,
          record: result,
        })
        mysqlStatus = mysqlResult.status
      } catch (error) {
        mysqlStatus = 'failed'
        failures.push(`mysql:${error.message}`)
      }
    }

    await safeWriteWebhookLog({
      requestId,
      source: 'caoliao',
      receivedAt,
      headers: safeHeaders,
      body: parsedBody,
      rawBody,
      parseError,
      processStatus: failures.length ? 'partial-fail' : 'success',
      identifyTrace,
      dispatchResult: result,
      persistence: {
        jsonl: jsonlStatus,
        mysql: mysqlStatus,
        mysqlEventId: mysqlResult?.eventId || '',
      },
      errorMessage: failures.join('; '),
    })
    console.log(
      `[caoliao] webhook processed requestId=${requestId} type=${result.formType} jsonl=${jsonlStatus} mysql=${mysqlStatus}`,
    )
  } catch (error) {
    if (rawMysqlEvent) {
      try {
        await failMysqlRawEvent(rawMysqlEvent, error)
      } catch (mysqlError) {
        failures.push(`mysql-mark-failed:${mysqlError.message}`)
      }
    }
    await safeWriteWebhookLog({
      requestId,
      source: 'caoliao',
      receivedAt,
      headers: safeHeaders,
      rawBody,
      parseError,
      processStatus: 'fail',
      errorMessage: [
        error instanceof Error ? error.message : String(error),
        ...failures,
      ].filter(Boolean).join('; '),
    })
    console.error(`[caoliao] webhook failed requestId=${requestId}`, error)
  }

  return { success: true, message: 'received' }
}
