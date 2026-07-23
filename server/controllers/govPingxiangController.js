import { verifyInternalDataRequest } from '../security/requestAuth.js'
import { buildProtectedPingxiangData } from '../services/govPingxiangDataService.js'

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

export const handleGovPingxiangDashboard = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }

  const auth = verifyInternalDataRequest(request)
  if (!auth.accepted) {
    sendJson(response, 401, { success: false, message: 'unauthorized' })
    return
  }

  try {
    const dashboard = await buildProtectedPingxiangData()
    sendJson(response, 200, { success: true, ...dashboard })
  } catch (error) {
    console.error('[gov:pingxiang] dashboard read failed', error)
    const disabled = error?.message === 'real-data-source-disabled'
    sendJson(response, disabled ? 409 : 503, {
      success: false,
      message: disabled ? 'real data source disabled' : 'data service unavailable',
    })
  }
}
