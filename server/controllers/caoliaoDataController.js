import { readBusinessEvents } from '../services/caoliaoDataStore.js'
import { resolveRequestAuth } from '../security/sessionAuth.js'

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

const requireDataAccess = async (request, response, { adminOnly = true } = {}) => {
  const auth = await resolveRequestAuth(request, { allowInternal: true })
  if (!auth) {
    sendJson(response, 401, { success: false, message: '请先登录后访问' })
    return null
  }
  if (adminOnly && auth.role !== 'admin') {
    sendJson(response, 403, { success: false, message: '当前账号无权访问该数据' })
    return null
  }
  return auth
}

const getLimit = request => {
  const url = new URL(request.url, 'http://localhost')
  return url.searchParams.get('limit') || 50
}

const diagnosticEvent = event => ({
  requestId: event.requestId || '',
  receivedAt: event.receivedAt || '',
  branch: event.branch || 'unknown',
  recognized: Boolean(event.recognized),
  formName: event.identifyTrace?.formName || event.record?.formName || '',
  formNumber: event.identifyTrace?.formNumber || event.record?.formNumber || '',
  serialNumber: event.identifyTrace?.serialNumber || event.record?.serialNumber || '',
  identifyReason: event.identifyTrace?.identifyReason || '',
})

export const handleCaoliaoEvents = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!await requireDataAccess(request, response)) return
  const events = await readBusinessEvents({ limit: getLimit(request) })
  sendJson(response, 200, {
    success: true,
    total: events.length,
    items: events.map(diagnosticEvent),
  })
}

export const handleCaoliaoServiceRecords = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!await requireDataAccess(request, response)) return
  const events = await readBusinessEvents({ branch: 'serviceRecord', limit: getLimit(request) })
  sendJson(response, 200, {
    success: true,
    total: events.length,
    items: events.map(event => ({
      requestId: event.requestId,
      receivedAt: event.receivedAt,
      ...event.record,
    })),
  })
}

export const handleCaoliaoHazards = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!await requireDataAccess(request, response)) return
  const events = await readBusinessEvents({ branch: 'hazard', limit: getLimit(request) })
  sendJson(response, 200, {
    success: true,
    total: events.length,
    items: events.map(event => ({
      requestId: event.requestId,
      receivedAt: event.receivedAt,
      ...event.record,
    })),
  })
}

export const handleCaoliaoHealth = async (_request, response) => {
  sendJson(response, 200, { success: true, service: 'caoliao-webhook', message: 'ok' })
}
