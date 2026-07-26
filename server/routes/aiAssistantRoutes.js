import { handleAiAssistantQuery } from '../controllers/aiAssistantController.js'
import { consumeRequestRateLimit } from '../security/rateLimit.js'
import { sendJson } from '../utils/http.js'

const genericPattern = /^\/api\/gov\/projects\/([^/]+)\/assistant\/query\/?$/
const pingxiangPath = '/api/gov/pingxiang/assistant/query'

export const matchAiAssistantRoute = request => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  if (pathname === pingxiangPath || pathname === `${pingxiangPath}/`) {
    return { projectId: 'pingxiang' }
  }
  const match = pathname.match(genericPattern)
  return match ? { projectId: decodeURIComponent(match[1]) } : null
}

export const handleAiAssistantRoute = async (request, response, match) => {
  const rateLimit = consumeRequestRateLimit(request, 'p3-ai-assistant', {
    limit: process.env.P3_AI_RATE_LIMIT_PER_MINUTE || 20,
  })
  if (!rateLimit.allowed) {
    sendJson(response, 429, {
      success: false,
      message: '访问过于频繁，请稍后重试',
    }, { 'Retry-After': String(rateLimit.retryAfterSeconds) })
    return
  }
  await handleAiAssistantQuery(request, response, match.projectId)
}
