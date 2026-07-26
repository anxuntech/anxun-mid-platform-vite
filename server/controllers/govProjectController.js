import { buildProtectedPingxiangData } from '../services/govPingxiangDataService.js'
import {
  auditDeniedAccess,
  projectAccess,
  requireRequestAuth,
} from '../security/sessionAuth.js'
import { sendJson } from '../utils/http.js'

const maskPhone = value => {
  const text = String(value || '')
  return text.length >= 7 ? `${text.slice(0, 3)}****${text.slice(-4)}` : text ? '已留存' : ''
}

const sanitizeDashboard = (dashboard, auth) => {
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

const allRecords = dashboard => [
  ...(dashboard.hazard_reports || []).map(record => ({ ...record, record_type: 'hazard' })),
  ...(dashboard.patrol_records || []).map(record => ({ ...record, record_type: 'inspection' })),
  ...(dashboard.work_permits || []).map(record => ({ ...record, record_type: 'work_permit' })),
  ...(dashboard.training_exam_records || []).map(record => ({ ...record, record_type: 'training' })),
]

export const handleGovProjectRead = async (request, response, { projectId, resource, resourceId }) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  const auth = await requireRequestAuth(request, response, { allowInternal: true })
  if (!auth) return
  const project = projectAccess(auth, projectId)
  if (!project) {
    await auditDeniedAccess({
      request,
      auth,
      projectId,
      resourceType: 'project',
      resourceId: projectId,
    })
    sendJson(response, 403, { success: false, message: '当前账号无权访问该项目' })
    return
  }

  try {
    const dashboard = sanitizeDashboard(
      await buildProtectedPingxiangData({ projectId }),
      auth,
    )
    if (resource === 'dashboard') {
      sendJson(response, 200, { success: true, ...dashboard })
      return
    }
    if (resource === 'companies') {
      const items = resourceId
        ? dashboard.companies.filter(item => String(item.company_id) === String(resourceId))
        : dashboard.companies
      if (resourceId && !items.length) {
        sendJson(response, 404, { success: false, message: '未找到该企业' })
        return
      }
      sendJson(response, 200, { success: true, total: items.length, items })
      return
    }
    if (resource === 'records') {
      let items = allRecords(dashboard)
      if (resourceId) items = items.filter(item => String(item.id) === String(resourceId))
      if (resourceId && !items.length) {
        sendJson(response, 404, { success: false, message: '未找到该记录' })
        return
      }
      sendJson(response, 200, { success: true, total: items.length, items })
      return
    }
    sendJson(response, 404, { success: false, message: 'not found' })
  } catch (error) {
    console.error('[gov:project] protected data read failed', {
      projectId,
      error: error?.message || 'unknown',
    })
    const disabled = error?.message === 'real-data-source-disabled'
    sendJson(response, disabled ? 409 : 503, {
      success: false,
      message: disabled ? '真实数据源尚未启用' : '数据服务暂不可用',
    })
  }
}
