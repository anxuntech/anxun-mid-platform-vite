import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import {
  createAuthSession,
  findActiveSession,
  findAuthUserByUsername,
  listUserProjects,
  recordLoginFailure,
  recordLoginSuccess,
  revokeAuthSession,
  touchAuthSession,
  writeAuthAudit,
} from '../repositories/authRepository.js'
import { getClientIp, getRequestId, getUserAgent, parseCookies } from '../utils/http.js'

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'anxun_session'
export const CSRF_COOKIE_NAME = process.env.AUTH_CSRF_COOKIE_NAME || 'anxun_csrf'

const idleMinutes = () => Math.max(5, Number(process.env.AUTH_SESSION_IDLE_MINUTES || 120))
const absoluteHours = () => Math.max(1, Number(process.env.AUTH_SESSION_MAX_HOURS || 12))
const bcryptRounds = () => Math.min(14, Math.max(10, Number(process.env.AUTH_BCRYPT_ROUNDS || 12)))
const maxLoginAttempts = () => Math.max(3, Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || 5))
const lockMinutes = () => Math.max(1, Number(process.env.AUTH_LOGIN_LOCK_MINUTES || 15))

const dummyPasswordHash = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5YHh1M8KQbY8E4fVn6uD3zM7JmIYv2K'

export const normalizeUsername = value => String(value || '').trim().toLowerCase().slice(0, 128)
export const hashOpaqueToken = token => createHash('sha256').update(String(token || '')).digest('hex')
export const newOpaqueToken = () => randomBytes(32).toString('base64url')
export const hashPassword = password => bcrypt.hash(String(password || ''), bcryptRounds())
export const verifyPassword = (password, passwordHash) => bcrypt.compare(String(password || ''), passwordHash)

const sessionPayload = (session, projects) => ({
  userId: session.user_id,
  username: session.username,
  displayName: session.display_name,
  organizationName: session.organization_name,
  organizationType: session.organization_type,
  role: session.role,
  projects: projects.map(project => ({
    projectId: project.project_id,
    projectSlug: project.project_slug,
    projectName: project.project_name,
    countyId: project.county_id,
    countySlug: project.county_slug,
    countyName: project.county_name,
    canDownloadSummary: Boolean(project.can_download_summary),
    canDownloadDetail: Boolean(project.can_download_detail),
  })),
})

const auditContext = request => ({
  requestId: getRequestId(request),
  ipAddress: getClientIp(request),
  userAgent: getUserAgent(request),
})

export const login = async ({ request, username, password }) => {
  const normalizedUsername = normalizeUsername(username)
  const context = auditContext(request)
  const user = normalizedUsername ? await findAuthUserByUsername(normalizedUsername) : null
  const passwordMatches = await verifyPassword(password, user?.password_hash || dummyPasswordHash)
  const lockedUntil = user?.locked_until ? Date.parse(String(user.locked_until).replace(' ', 'T') + '+08:00') : 0
  const locked = lockedUntil > Date.now()
  const active = user?.status === 'active'

  if (!user || !passwordMatches || !active || locked) {
    if (user && active && !locked) {
      await recordLoginFailure(user.user_id, maxLoginAttempts(), lockMinutes())
    }
    await writeAuthAudit({
      userId: user?.user_id || null,
      username: normalizedUsername,
      organizationName: user?.organization_name || '',
      action: 'login',
      resultStatus: 'failed',
      ...context,
      detail: { reason: locked ? 'temporarily-locked' : active ? 'invalid-credentials' : 'account-disabled' },
    })
    await new Promise(resolve => setTimeout(resolve, 250))
    return null
  }

  const projects = await listUserProjects(user.user_id)
  const sessionToken = newOpaqueToken()
  const csrfToken = newOpaqueToken()
  const sessionId = await createAuthSession({
    userId: user.user_id,
    tokenHash: hashOpaqueToken(sessionToken),
    csrfTokenHash: hashOpaqueToken(csrfToken),
    idleMinutes: idleMinutes(),
    absoluteHours: absoluteHours(),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
  await recordLoginSuccess(user.user_id)
  await writeAuthAudit({
    userId: user.user_id,
    username: user.username,
    organizationName: user.organization_name,
    action: 'login',
    resultStatus: 'success',
    ...context,
  })

  return {
    sessionId,
    sessionToken,
    csrfToken,
    maxAgeSeconds: absoluteHours() * 60 * 60,
    session: sessionPayload(user, projects),
  }
}

export const authenticateRequest = async request => {
  const token = parseCookies(request)[AUTH_COOKIE_NAME]
  if (!token) return null
  const session = await findActiveSession(hashOpaqueToken(token))
  if (!session) return null
  const projects = await listUserProjects(session.user_id)
  await touchAuthSession(session.session_id, idleMinutes())
  return {
    ...sessionPayload(session, projects),
    sessionId: session.session_id,
    csrfTokenHash: session.csrf_token_hash,
  }
}

export const csrfMatches = (request, auth) => {
  if (!auth) return false
  const supplied = String(request.headers['x-csrf-token'] || '')
  const suppliedHash = Buffer.from(hashOpaqueToken(supplied))
  const expectedHash = Buffer.from(String(auth.csrfTokenHash || ''))
  return suppliedHash.length === expectedHash.length && timingSafeEqual(suppliedHash, expectedHash)
}

export const logout = async ({ request, auth }) => {
  if (!auth) return
  await revokeAuthSession(auth.sessionId, 'logout')
  await writeAuthAudit({
    userId: auth.userId,
    username: auth.username,
    organizationName: auth.organizationName,
    action: 'logout',
    resultStatus: 'success',
    ...auditContext(request),
  })
}

export const authCookieSecure = () =>
  process.env.AUTH_COOKIE_SECURE === undefined
    ? process.env.NODE_ENV === 'production'
    : ['1', 'true', 'yes', 'on'].includes(String(process.env.AUTH_COOKIE_SECURE).toLowerCase())
