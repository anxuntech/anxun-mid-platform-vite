import {
  handleGovPingxiangCompanies,
  handleGovPingxiangDashboard,
  handleGovPingxiangExport,
  handleGovPingxiangReportPdf,
  handleGovPingxiangRecords,
  handleGovPingxiangReports,
} from '../controllers/govPingxiangController.js'
import { sendJson } from '../utils/http.js'
import { consumeRequestRateLimit } from '../security/rateLimit.js'

const prefix = '/api/gov/pingxiang'

export const isGovPingxiangRoute = request =>
  new URL(request.url, 'http://localhost').pathname.startsWith(prefix)

export const handleGovPingxiangRoute = async (request, response) => {
  const rateLimit = consumeRequestRateLimit(request, 'gov-pingxiang', {
    limit: process.env.AUTH_API_RATE_LIMIT_PER_MINUTE || 600,
  })
  if (!rateLimit.allowed) {
    sendJson(response, 429, {
      success: false,
      message: '访问过于频繁，请稍后重试',
    }, { 'Retry-After': String(rateLimit.retryAfterSeconds) })
    return
  }
  const pathname = new URL(request.url, 'http://localhost').pathname
  if (pathname === `${prefix}/dashboard`) {
    await handleGovPingxiangDashboard(request, response)
    return
  }
  if (pathname === `${prefix}/companies`) {
    await handleGovPingxiangCompanies(request, response)
    return
  }
  if (pathname.startsWith(`${prefix}/companies/`)) {
    await handleGovPingxiangCompanies(
      request,
      response,
      decodeURIComponent(pathname.slice(`${prefix}/companies/`.length)),
    )
    return
  }
  if (pathname === `${prefix}/records`) {
    await handleGovPingxiangRecords(request, response)
    return
  }
  if (pathname.startsWith(`${prefix}/records/`)) {
    await handleGovPingxiangRecords(
      request,
      response,
      decodeURIComponent(pathname.slice(`${prefix}/records/`.length)),
    )
    return
  }
  if (pathname === `${prefix}/reports`) {
    await handleGovPingxiangReports(request, response)
    return
  }
  if (pathname === `${prefix}/exports/summary`) {
    await handleGovPingxiangExport(request, response, 'company-summary')
    return
  }
  if (pathname === `${prefix}/exports/business-summary`) {
    await handleGovPingxiangExport(request, response, 'business-summary')
    return
  }
  if (pathname === `${prefix}/exports/company-detail`) {
    await handleGovPingxiangExport(request, response, 'company-detail')
    return
  }
  if (pathname === `${prefix}/exports/report-pdf`) {
    await handleGovPingxiangReportPdf(request, response)
    return
  }
  sendJson(response, 404, { success: false, message: 'not found' })
}
