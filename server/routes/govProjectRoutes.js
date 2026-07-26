import { handleGovProjectRead } from '../controllers/govProjectController.js'
import { consumeRequestRateLimit } from '../security/rateLimit.js'
import { sendJson } from '../utils/http.js'

const pattern = /^\/api\/gov\/projects\/([^/]+)\/(dashboard|companies|records)(?:\/([^/]+))?\/?$/

export const matchGovProjectRoute = request => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  const match = pathname.match(pattern)
  return match
    ? {
        projectId: decodeURIComponent(match[1]),
        resource: match[2],
        resourceId: match[3] ? decodeURIComponent(match[3]) : '',
      }
    : null
}

export const handleGovProjectRoute = async (request, response, match) => {
  const rateLimit = consumeRequestRateLimit(request, 'gov-project', {
    limit: process.env.AUTH_API_RATE_LIMIT_PER_MINUTE || 600,
  })
  if (!rateLimit.allowed) {
    sendJson(response, 429, {
      success: false,
      message: '访问过于频繁，请稍后重试',
    }, { 'Retry-After': String(rateLimit.retryAfterSeconds) })
    return
  }
  await handleGovProjectRead(request, response, match)
}
