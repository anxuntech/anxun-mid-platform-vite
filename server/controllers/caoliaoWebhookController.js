import { verifyWebhookRequest } from '../security/requestAuth.js'
import { processCaoliaoWebhook } from '../services/caoliaoWebhookService.js'

const readRequestBody = request =>
  new Promise((resolve, reject) => {
    const chunks = []
    let totalLength = 0
    let settled = false

    request.on('data', chunk => {
      if (settled) return
      totalLength += chunk.length
      if (totalLength > 1024 * 1024) {
        settled = true
        reject(new Error('payload-too-large'))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (!settled) resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', error => {
      if (!settled) reject(error)
    })
  })

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

export const handleCaoliaoWebhook = async (request, response) => {
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }

  let rawBody = '{}'
  let parsedBody = {}
  let parseError = ''
  const auth = verifyWebhookRequest(request)

  try {
    rawBody = await readRequestBody(request)
    const normalizedBody = rawBody.replace(/^\uFEFF/, '').trim()
    parsedBody = normalizedBody ? JSON.parse(normalizedBody) : {}
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error)
    console.error('[caoliao] request body parse failed, continue with empty body', error)
  }

  try {
    const result = await processCaoliaoWebhook({
      headers: request.headers,
      rawBody,
      parsedBody,
      parseError,
      auth,
    })
    sendJson(response, 200, result)
  } catch (error) {
    console.error('[caoliao] controller fallback triggered', error)
    sendJson(response, 200, { success: true, message: 'received' })
  }
}
