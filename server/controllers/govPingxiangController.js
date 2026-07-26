import { existsSync } from 'node:fs'
import PDFDocument from 'pdfkit'
import { buildProtectedPingxiangData } from '../services/govPingxiangDataService.js'
import {
  auditDeniedAccess,
  projectAccess,
  requireRequestAuth,
  requireTrustedCsrf,
} from '../security/sessionAuth.js'
import { isTrustedOrigin } from '../security/originPolicy.js'
import { readBoolean } from '../config/runtimeConfig.js'
import { getClientIp, getRequestId, getUserAgent, sendJson } from '../utils/http.js'
import { writeAuthAudit, writeDownloadAudit } from '../repositories/authRepository.js'

const projectId = 'pingxiang'

const maskPhone = value => {
  const text = String(value || '')
  if (text.length < 7) return text ? '已留存' : ''
  return `${text.slice(0, 3)}****${text.slice(-4)}`
}

const sanitizeForAuth = (dashboard, auth) => {
  if (auth.role === 'admin' || auth.internal) return dashboard
  return {
    ...dashboard,
    companies: dashboard.companies.map(company => ({
      ...company,
      contact_name: company.contact_name ? `${company.contact_name.slice(0, 1)}**` : '',
      contact_phone: maskPhone(company.contact_phone),
    })),
  }
}

const recordGroups = dashboard => ({
  hazard: dashboard.hazard_reports || [],
  inspection: dashboard.patrol_records || [],
  work_permit: dashboard.work_permits || [],
  training: dashboard.training_exam_records || [],
})

const allRecords = dashboard =>
  Object.entries(recordGroups(dashboard)).flatMap(([recordType, records]) =>
    records.map(record => ({ ...record, record_type: recordType })))

const findRecord = (dashboard, recordId) =>
  allRecords(dashboard).find(record => String(record.id) === String(recordId))

const authorizePingxiang = async (request, response, permission = 'view') => {
  const auth = await requireRequestAuth(request, response, { allowInternal: true })
  if (!auth) return null
  const project = projectAccess(auth, projectId, permission)
  if (project) return { auth, project }
  await auditDeniedAccess({
    request,
    auth,
    projectId,
    resourceType: 'project',
    resourceId: projectId,
  })
  sendJson(response, 403, { success: false, message: '当前账号无权访问该项目' })
  return null
}

export const sourceEnvironmentForRequest = (request, auth) => {
  const requested = new URL(request?.url || '/', 'http://localhost').searchParams.get('sourceEnvironment')
  return requested === 'test'
    && auth?.role === 'admin'
    && readBoolean('P3_ADMIN_TEST_DATA_PREVIEW', false)
    ? 'test'
    : undefined
}

const loadDashboard = async (auth, sourceEnvironment) =>
  sanitizeForAuth(await buildProtectedPingxiangData({
    projectId,
    sourceEnvironment,
  }), auth)

const handleReadError = (response, error) => {
  console.error('[gov:pingxiang] protected data read failed', error)
  const disabled = error?.message === 'real-data-source-disabled'
  sendJson(response, disabled ? 409 : 503, {
    success: false,
    message: disabled ? '真实数据源尚未启用' : '数据服务暂不可用',
  })
}

export const handleGovPingxiangDashboard = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  const access = await authorizePingxiang(request, response)
  if (!access) return
  try {
    const dashboard = await loadDashboard(
      access.auth,
      sourceEnvironmentForRequest(request, access.auth),
    )
    sendJson(response, 200, { success: true, ...dashboard })
  } catch (error) {
    handleReadError(response, error)
  }
}

export const handleGovPingxiangCompanies = async (request, response, companyId = '') => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  const access = await authorizePingxiang(request, response)
  if (!access) return
  try {
    const dashboard = await loadDashboard(access.auth)
    if (!companyId) {
      sendJson(response, 200, { success: true, total: dashboard.companies.length, items: dashboard.companies })
      return
    }
    const company = dashboard.companies.find(item => String(item.company_id) === String(companyId))
    if (!company) {
      sendJson(response, 404, { success: false, message: '未找到该企业' })
      return
    }
    const records = allRecords(dashboard).filter(item => item.company_id === company.company_id)
    sendJson(response, 200, { success: true, company, records })
  } catch (error) {
    handleReadError(response, error)
  }
}

export const handleGovPingxiangRecords = async (request, response, recordId = '') => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  const access = await authorizePingxiang(request, response)
  if (!access) return
  try {
    const dashboard = await loadDashboard(access.auth)
    if (recordId) {
      const record = findRecord(dashboard, recordId)
      if (!record) {
        sendJson(response, 404, { success: false, message: '未找到该记录' })
        return
      }
      if (!access.auth.internal) {
        await writeAuthAudit({
          userId: access.auth.userId,
          username: access.auth.username,
          organizationName: access.auth.organizationName,
          action: 'view-sensitive-detail',
          resultStatus: 'success',
          projectId,
          resourceType: 'business-record',
          resourceId: recordId,
          requestId: getRequestId(request),
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
        })
      }
      sendJson(response, 200, { success: true, record })
      return
    }

    const url = new URL(request.url, 'http://localhost')
    const requestedType = url.searchParams.get('type') || ''
    const companyId = url.searchParams.get('companyId') || ''
    const allowedTypes = new Set(['hazard', 'inspection', 'work_permit', 'training'])
    let records = allRecords(dashboard)
    if (requestedType && allowedTypes.has(requestedType)) {
      records = records.filter(record => record.record_type === requestedType)
    }
    if (companyId) {
      const companyExists = dashboard.companies.some(company => company.company_id === companyId)
      if (!companyExists) {
        sendJson(response, 404, { success: false, message: '未找到该企业' })
        return
      }
      records = records.filter(record => record.company_id === companyId)
    }
    sendJson(response, 200, { success: true, total: records.length, items: records })
  } catch (error) {
    handleReadError(response, error)
  }
}

export const handleGovPingxiangReports = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  const access = await authorizePingxiang(request, response)
  if (!access) return
  try {
    const dashboard = await loadDashboard(access.auth)
    sendJson(response, 200, {
      success: true,
      generatedAt: dashboard.generated_at,
      projectId: dashboard.project_id,
      countyName: dashboard.county_name,
      summary: dashboard.summary,
      warnings: dashboard.warnings,
    })
  } catch (error) {
    handleReadError(response, error)
  }
}

const xmlEscape = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const spreadsheetXml = ({ dashboard, organizationName, exportType }) => {
  const groupedRecords = recordGroups(dashboard)
  const isDetail = exportType === 'company-detail'
  const isBusinessSummary = exportType === 'business-summary'
  const rows = isDetail
    ? allRecords(dashboard).map(record => [
        record.record_type,
        record.company_name,
        record.title,
        record.status,
        record.submitted_at,
      ])
    : isBusinessSummary
      ? [
          ['隐患整改', groupedRecords.hazard.length, groupedRecords.hazard.filter(item => !/已闭环|已整改|已复查|销号|无需处理/.test(item.status || '')).length, '需关注数按未闭环状态统计'],
          ['巡检点检', groupedRecords.inspection.length, groupedRecords.inspection.filter(item => /异常|漏检|问题/.test(item.status || '')).length, '需关注数按异常或漏检统计'],
          ['作业票', groupedRecords.work_permit.length, groupedRecords.work_permit.filter(item => !/已完成|已关闭|已结束/.test(item.status || '')).length, '需关注数按未完成状态统计'],
          ['培训考试', groupedRecords.training.length, groupedRecords.training.filter(item => /不合格|未通过/.test(item.exam_result || item.status || '')).length, '需关注数按考试未通过统计'],
        ]
      : dashboard.companies.map(company => {
        const companyRecords = allRecords(dashboard).filter(record => record.company_id === company.company_id)
        return [
          company.company_name,
          company.industry,
          companyRecords.filter(record => record.record_type === 'hazard').length,
          companyRecords.filter(record => record.record_type === 'inspection').length,
          companyRecords.filter(record => record.record_type === 'work_permit').length,
          companyRecords.filter(record => record.record_type === 'training').length,
        ]
      })
  const headers = isDetail
    ? ['记录类型', '企业名称', '记录名称', '状态', '发生时间']
    : isBusinessSummary
      ? ['业务类型', '记录总数', '需关注记录', '统计说明']
      : ['企业名称', '所属行业', '隐患记录', '巡检记录', '作业票', '培训记录']
  const worksheetRows = [
    ['项目名称', '平乡县企业现场安全管理项目'],
    ['导出机构', organizationName],
    ['导出时间', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })],
    ['使用说明', '仅供项目工作使用'],
    [],
    headers,
    ...rows,
  ]
  const xmlRows = worksheetRows.map(row =>
    `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`).join('')}</Row>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="平乡项目数据"><Table>${xmlRows}</Table></Worksheet>
</Workbook>`
}

export const handleGovPingxiangExport = async (request, response, exportType = 'company-summary') => {
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!isTrustedOrigin(request)) {
    sendJson(response, 403, { success: false, message: '请求来源不受信任' })
    return
  }
  const detail = exportType === 'company-detail'
  const permission = detail ? 'download-detail' : 'download-summary'
  const access = await authorizePingxiang(request, response, permission)
  if (!access) return
  if (!requireTrustedCsrf(request, response, access.auth)) return

  const fileName = exportType === 'company-detail'
    ? '平乡县企业记录明细.xls'
    : exportType === 'business-summary'
      ? '平乡县四项业务汇总.xls'
      : '平乡县企业运行汇总.xls'
  const auditBase = {
    userId: access.auth.userId,
    username: access.auth.username,
    organizationName: access.auth.organizationName,
    projectId,
    downloadType: exportType,
    filters: {},
    fileName,
    requestId: getRequestId(request),
    ipAddress: getClientIp(request),
  }
  try {
    const dashboard = await loadDashboard(access.auth)
    const body = spreadsheetXml({
      dashboard,
      organizationName: access.auth.organizationName,
      exportType,
    })
    await writeDownloadAudit({
      ...auditBase,
      resultStatus: 'success',
      rowCount: detail
        ? allRecords(dashboard).length
        : exportType === 'business-summary'
          ? 4
          : dashboard.companies.length,
    })
    response.writeHead(200, {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    })
    response.end(body)
  } catch (error) {
    console.error('[gov:pingxiang] export failed', error)
    await writeDownloadAudit({ ...auditBase, resultStatus: 'failed' }).catch(() => {})
    sendJson(response, 503, { success: false, message: '导出暂不可用，请稍后重试' })
  }
}

const reportFontPath = () => {
  const candidates = [
    process.env.REPORT_PDF_FONT_PATH,
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf',
    '/usr/share/fonts/truetype/unifont/unifont.ttf',
    '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',
    'C:\\Windows\\Fonts\\simhei.ttf',
    'C:\\Windows\\Fonts\\Deng.ttf',
  ].filter(Boolean)
  return candidates.find(candidate => existsSync(candidate)) || ''
}

export const buildPingxiangReportPdf = async ({
  dashboard,
  organizationName,
  allowBuiltinFont = false,
}) => {
  const fontPath = reportFontPath()
  if (!fontPath && !allowBuiltinFont) throw new Error('report-pdf-font-unavailable')

  const document = new PDFDocument({
    size: 'A4',
    margins: { top: 48, right: 48, bottom: 48, left: 48 },
    info: {
      Title: '平乡县企业现场安全管理阶段报告',
      Author: '安巡数智科技有限公司',
      Subject: '平乡县企业现场安全管理项目汇总',
    },
  })
  const chunks = []
  const completed = new Promise((resolve, reject) => {
    document.on('data', chunk => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)
  })

  if (fontPath) document.font(fontPath)
  document.fillColor('#17365d').fontSize(22).text('平乡县企业现场安全管理阶段报告')
  document.moveDown(0.4)
  document.fillColor('#64748b').fontSize(10)
    .text(`导出机构：${organizationName}`)
    .text(`导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`)
    .text('使用说明：仅供项目工作使用')
  document.moveDown(1.2)
  document.fillColor('#0f172a').fontSize(15).text('一、项目运行概况')
  document.moveDown(0.4)
  const summary = dashboard.summary || {}
  const summaryRows = [
    ['纳入企业', `${summary.company_count ?? dashboard.companies.length} 家`],
    ['隐患记录', `${summary.hazard_count ?? dashboard.hazard_reports.length} 条`],
    ['巡检记录', `${summary.patrol_count ?? dashboard.patrol_records.length} 条`],
    ['作业票记录', `${summary.work_permit_count ?? dashboard.work_permits.length} 条`],
    ['培训记录', `${summary.training_count ?? dashboard.training_exam_records.length} 条`],
    ['已闭环隐患', `${summary.closed_hazard_count ?? 0} 条`],
  ]
  for (const [label, value] of summaryRows) {
    document.fillColor('#334155').fontSize(11).text(`${label}：${value}`)
  }
  document.moveDown(1)
  document.fillColor('#0f172a').fontSize(15).text('二、企业运行摘要')
  document.moveDown(0.4)
  dashboard.companies.slice(0, 30).forEach((company, index) => {
    document.fillColor('#334155').fontSize(10)
      .text(`${index + 1}. ${company.company_name}  ${company.industry || '行业未提供'}`)
  })
  if (!dashboard.companies.length) {
    document.fillColor('#64748b').fontSize(10).text('暂无企业数据')
  }
  document.moveDown(1)
  document.fillColor('#0f172a').fontSize(15).text('三、数据说明')
  document.moveDown(0.4)
  document.fillColor('#475569').fontSize(10)
    .text('本报告由当前账号授权范围内的项目数据生成。未归集字段不使用演示数字补齐；数据异常时以系统归集状态为准。')
  if (dashboard.warnings?.length) {
    document.moveDown(0.5)
    document.fillColor('#9a3412')
      .text(`数据提示：${dashboard.warnings.map(item => item.message || item).join('；')}`)
  }
  document.end()
  return completed
}

export const handleGovPingxiangReportPdf = async (request, response) => {
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!isTrustedOrigin(request)) {
    sendJson(response, 403, { success: false, message: '请求来源不受信任' })
    return
  }
  const access = await authorizePingxiang(request, response, 'download-summary')
  if (!access) return
  if (!requireTrustedCsrf(request, response, access.auth)) return

  const fileName = '平乡县企业现场安全管理阶段报告.pdf'
  const auditBase = {
    userId: access.auth.userId,
    username: access.auth.username,
    organizationName: access.auth.organizationName,
    projectId,
    downloadType: 'project-report-pdf',
    filters: {},
    fileName,
    requestId: getRequestId(request),
    ipAddress: getClientIp(request),
  }
  try {
    const dashboard = await loadDashboard(access.auth)
    const body = await buildPingxiangReportPdf({
      dashboard,
      organizationName: access.auth.organizationName,
    })
    await writeDownloadAudit({
      ...auditBase,
      resultStatus: 'success',
      rowCount: dashboard.companies.length,
    })
    response.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    })
    response.end(body)
  } catch (error) {
    console.error('[gov:pingxiang] pdf export failed', error)
    await writeDownloadAudit({ ...auditBase, resultStatus: 'failed' }).catch(() => {})
    sendJson(response, 503, { success: false, message: '报告生成暂不可用，请稍后重试' })
  }
}
