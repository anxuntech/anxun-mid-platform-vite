import { createServer } from 'node:http'
import { routeRequest } from './routes/index.js'
import { getWebhookLogFile } from './utils/fileLogger.js'

const port = Number(process.env.WEBHOOK_PORT || process.env.PORT || 8787)

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  await routeRequest(request, response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`[server] webhook service listening on http://0.0.0.0:${port}`)
  console.log('[server] route registered: POST /api/caoliao/webhook')
  console.log(`[server] webhook log file: ${getWebhookLogFile()}`)
})
