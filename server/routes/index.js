import { handleCaoliaoWebhookRoute, isCaoliaoWebhookRoute } from './caoliaoRoutes.js'

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

export const routeRequest = async (request, response) => {
  if (isCaoliaoWebhookRoute(request)) {
    await handleCaoliaoWebhookRoute(request, response)
    return
  }

  sendJson(response, 404, {
    success: false,
    message: 'not found',
  })
}
