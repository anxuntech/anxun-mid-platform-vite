import { handleCaoliaoWebhook } from '../controllers/caoliaoWebhookController.js'
import {
  handleCaoliaoEvents,
  handleCaoliaoHazards,
  handleCaoliaoHealth,
  handleCaoliaoServiceRecords,
} from '../controllers/caoliaoDataController.js'
import { consumeRequestRateLimit } from '../security/rateLimit.js'
import { sendJson } from '../utils/http.js'

export const isCaoliaoWebhookRoute = request =>
  new URL(request.url, 'http://localhost').pathname === '/api/caoliao/webhook'
export const isCaoliaoDataRoute = request => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  return ['/api/caoliao/health', '/api/caoliao/events', '/api/caoliao/service-records', '/api/caoliao/hazards'].includes(pathname)
}

export const handleCaoliaoWebhookRoute = async (request, response) => {
  await handleCaoliaoWebhook(request, response)
}

export const handleCaoliaoDataRoute = async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname

  if (pathname === '/api/caoliao/health') {
    await handleCaoliaoHealth(request, response)
    return
  }
  const rateLimit = consumeRequestRateLimit(request, 'caoliao-diagnostics', {
    limit: process.env.AUTH_API_RATE_LIMIT_PER_MINUTE || 600,
  })
  if (!rateLimit.allowed) {
    sendJson(response, 429, {
      success: false,
      message: '访问过于频繁，请稍后重试',
    }, { 'Retry-After': String(rateLimit.retryAfterSeconds) })
    return
  }

  if (pathname === '/api/caoliao/events') {
    await handleCaoliaoEvents(request, response)
    return
  }

  if (pathname === '/api/caoliao/hazards') {
    await handleCaoliaoHazards(request, response)
    return
  }

  await handleCaoliaoServiceRecords(request, response)
}
