import { verifyInternalDataRequest } from '../security/requestAuth.js'
import { readBusinessEvents } from '../services/caoliaoDataStore.js'

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

const requireInternalAccess = (request, response) => {
  const auth = verifyInternalDataRequest(request)
  if (auth.accepted) return true
  sendJson(response, 401, { success: false, message: 'unauthorized' })
  return false
}

const getLimit = request => {
  const url = new URL(request.url, 'http://localhost')
  return url.searchParams.get('limit') || 50
}

export const handleCaoliaoEvents = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!requireInternalAccess(request, response)) return
  const events = await readBusinessEvents({ limit: getLimit(request) })
  sendJson(response, 200, { success: true, total: events.length, items: events })
}

export const handleCaoliaoServiceRecords = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!requireInternalAccess(request, response)) return
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
  if (!requireInternalAccess(request, response)) return
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
