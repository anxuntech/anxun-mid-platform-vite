import { authenticateRequest, csrfMatches } from '../services/authService.js'
import { verifyInternalDataRequest } from './requestAuth.js'
import { getClientIp, getRequestId, getUserAgent, sendJson } from '../utils/http.js'
import { writeAuthAudit } from '../repositories/authRepository.js'

const systemAuthContext = {
  userId: null,
  username: 'internal-system',
  displayName: '内部自动化',
  organizationName: '安巡内部系统',
  organizationType: 'anxun',
  role: 'admin',
  projects: [{
    projectId: 'pingxiang',
    projectSlug: 'pingxiang',
    projectName: '平乡县企业现场安全管理项目',
    countyId: 'pingxiang',
    countySlug: 'pingxiang',
    countyName: '平乡县',
    canDownloadSummary: true,
    canDownloadDetail: true,
  }],
  sessionId: 'internal-system',
  internal: true,
}

export const resolveRequestAuth = async (request, { allowInternal = false } = {}) => {
  const session = await authenticateRequest(request)
  if (session) return session
  if (allowInternal && verifyInternalDataRequest(request).accepted) return systemAuthContext
  return null
}

export const requireRequestAuth = async (request, response, options = {}) => {
  const auth = await resolveRequestAuth(request, options)
  if (auth) return auth
  sendJson(response, 401, { success: false, message: '请先登录后访问' })
  return null
}

export const requireTrustedCsrf = (request, response, auth) => {
  if (auth?.internal || csrfMatches(request, auth)) return true
  sendJson(response, 403, { success: false, message: '请求校验失败，请刷新后重试' })
  return false
}

export const projectAccess = (auth, projectId, permission = 'view') => {
  const project = auth?.projects?.find(item => item.projectId === projectId)
  if (!project) return null
  if (permission === 'download-summary' && !project.canDownloadSummary) return null
  if (permission === 'download-detail' && auth.role !== 'admin' && !project.canDownloadDetail) return null
  return project
}

export const auditDeniedAccess = async ({ request, auth, projectId, resourceType, resourceId }) => {
  if (!auth || auth.internal) return
  await writeAuthAudit({
    userId: auth.userId,
    username: auth.username,
    organizationName: auth.organizationName,
    action: 'access-denied',
    resultStatus: 'denied',
    projectId: projectId || null,
    resourceType,
    resourceId,
    requestId: getRequestId(request),
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  })
}
