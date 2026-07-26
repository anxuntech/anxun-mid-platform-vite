import { createServer } from 'node:http'
import { routeRequest } from './routes/index.js'
import { getWebhookLogFile } from './utils/fileLogger.js'
import { applyCorsHeaders, applySecurityHeaders, isTrustedOrigin } from './security/originPolicy.js'

const port = Number(process.env.WEBHOOK_PORT || process.env.PORT || 8787)

const server = createServer(async (request, response) => {
  applySecurityHeaders(response)
  applyCorsHeaders(request, response)

  if (request.method === 'OPTIONS') {
    response.writeHead(isTrustedOrigin(request) ? 204 : 403)
    response.end()
    return
  }

  await routeRequest(request, response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`[server] webhook service listening on http://0.0.0.0:${port}`)
  console.log('[server] route registered: POST /api/caoliao/webhook')
  console.log('[server] route registered: GET /api/caoliao/events')
  console.log('[server] route registered: GET /api/caoliao/service-records')
  console.log('[server] protected routes registered: /api/auth/*')
  console.log('[server] protected route registered: GET /api/gov/pingxiang/dashboard')
  console.log('[server] protected AI route registered: POST /api/gov/projects/:projectId/assistant/query')
  console.log('[server] protected project routes registered: /api/gov/projects/:projectId/*')
  console.log(`[server] webhook log file: ${getWebhookLogFile()}`)
})
