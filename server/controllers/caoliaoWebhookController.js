import { processCaoliaoWebhook } from '../services/caoliaoWebhookService.js'

const readRequestBody = request =>
  new Promise((resolve, reject) => {
    const chunks = []
    let totalLength = 0

    request.on('data', chunk => {
      totalLength += chunk.length
      if (totalLength > 1024 * 1024) {
        reject(new Error('payload-too-large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })

    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })

    request.on('error', reject)
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

  try {
    rawBody = await readRequestBody(request)
    parsedBody = rawBody ? JSON.parse(rawBody) : {}
  } catch (error) {
    console.error('[caoliao] request body parse failed, continue with empty body', error)
  }

  try {
    const result = await processCaoliaoWebhook({
      headers: request.headers,
      rawBody,
      parsedBody,
    })
    sendJson(response, 200, result)
  } catch (error) {
    console.error('[caoliao] controller fallback triggered', error)
    sendJson(response, 200, {
      success: true,
      message: 'received',
    })
  }
}
