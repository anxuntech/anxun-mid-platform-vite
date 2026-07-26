import {
  handleCaoliaoDataRoute,
  handleCaoliaoWebhookRoute,
  isCaoliaoDataRoute,
  isCaoliaoWebhookRoute,
} from './caoliaoRoutes.js'
import { handleGovPingxiangRoute, isGovPingxiangRoute } from './govPingxiangRoutes.js'
import { handleAuthRoute, isAuthRoute } from './authRoutes.js'
import { handleAiAssistantRoute, matchAiAssistantRoute } from './aiAssistantRoutes.js'
import { handleGovProjectRoute, matchGovProjectRoute } from './govProjectRoutes.js'

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

export const routeRequest = async (request, response) => {
  const aiAssistantRoute = matchAiAssistantRoute(request)
  if (aiAssistantRoute) {
    await handleAiAssistantRoute(request, response, aiAssistantRoute)
    return
  }

  const govProjectRoute = matchGovProjectRoute(request)
  if (govProjectRoute) {
    await handleGovProjectRoute(request, response, govProjectRoute)
    return
  }

  if (isAuthRoute(request)) {
    await handleAuthRoute(request, response)
    return
  }

  if (isCaoliaoWebhookRoute(request)) {
    await handleCaoliaoWebhookRoute(request, response)
    return
  }

  if (isCaoliaoDataRoute(request)) {
    await handleCaoliaoDataRoute(request, response)
    return
  }

  if (isGovPingxiangRoute(request)) {
    await handleGovPingxiangRoute(request, response)
    return
  }

  sendJson(response, 404, {
    success: false,
    message: 'not found',
  })
}
