import { dispatchBusinessProcess } from './caoliaoBusinessService.js'
import { writeWebhookLog } from '../utils/fileLogger.js'

export const processCaoliaoWebhook = async ({ headers, rawBody, parsedBody }) => {
  const receivedAt = new Date().toISOString()
  const requestId = `caoliao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  try {
    const result = await dispatchBusinessProcess(parsedBody)
    await writeWebhookLog({
      requestId,
      source: 'caoliao',
      receivedAt,
      headers,
      body: parsedBody,
      rawBody,
      processStatus: 'success',
      dispatchResult: result,
    })
    console.log(`[caoliao] webhook processed requestId=${requestId} type=${result.formType}`)
  } catch (error) {
    await writeWebhookLog({
      requestId,
      source: 'caoliao',
      receivedAt,
      headers,
      body: parsedBody,
      rawBody,
      processStatus: 'fail',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    console.error(`[caoliao] webhook failed requestId=${requestId}`, error)
  }

  return {
    success: true,
    message: 'received',
  }
}
