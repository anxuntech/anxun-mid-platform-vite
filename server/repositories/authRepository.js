import { randomUUID } from 'node:crypto'
import { getMysqlPool } from '../db/mysql.js'

const jsonValue = value => JSON.stringify(value ?? {})

export const findAuthUserByUsername = async username => {
  const [rows] = await getMysqlPool().execute(
    `SELECT user_id, username, password_hash, display_name, organization_name,
            organization_type, role, status, failed_login_count, locked_until,
            password_changed_at, last_login_at
       FROM auth_users
      WHERE username = ?
      LIMIT 1`,
    [username],
  )
  return rows[0] || null
}

export const findAuthUserById = async userId => {
  const [rows] = await getMysqlPool().execute(
    `SELECT user_id, username, password_hash, display_name, organization_name,
            organization_type, role, status, failed_login_count, locked_until,
            password_changed_at, last_login_at
       FROM auth_users
      WHERE user_id = ?
      LIMIT 1`,
    [userId],
  )
  return rows[0] || null
}

export const listUserProjects = async userId => {
  const [rows] = await getMysqlPool().execute(
    `SELECT up.project_id, p.project_slug, p.project_name, p.county_id,
            c.county_slug, c.county_name,
            up.can_download_summary, up.can_download_detail
       FROM auth_user_projects up
       JOIN projects p ON p.project_id = up.project_id AND p.status = 'active'
       JOIN counties c ON c.county_id = p.county_id AND c.status = 'active'
      WHERE up.user_id = ?
      ORDER BY p.project_name`,
    [userId],
  )
  return rows
}

export const recordLoginFailure = async (userId, maxAttempts, lockMinutes) => {
  await getMysqlPool().execute(
    `UPDATE auth_users
        SET failed_login_count = failed_login_count + 1,
            locked_until = CASE
              WHEN failed_login_count + 1 >= ? THEN DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? MINUTE)
              ELSE locked_until
            END
      WHERE user_id = ?`,
    [maxAttempts, lockMinutes, userId],
  )
}

export const recordLoginSuccess = async userId => {
  await getMysqlPool().execute(
    `UPDATE auth_users
        SET failed_login_count = 0,
            locked_until = NULL,
            last_login_at = CURRENT_TIMESTAMP(3)
      WHERE user_id = ?`,
    [userId],
  )
}

export const createAuthSession = async ({
  userId,
  tokenHash,
  csrfTokenHash,
  idleMinutes,
  absoluteHours,
  ipAddress,
  userAgent,
}) => {
  const sessionId = randomUUID()
  await getMysqlPool().execute(
    `INSERT INTO auth_sessions (
       session_id, user_id, token_hash, csrf_token_hash,
       idle_expires_at, absolute_expires_at, ip_address, user_agent
     ) VALUES (
       ?, ?, ?, ?,
       DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? MINUTE),
       DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? HOUR),
       ?, ?
     )`,
    [
      sessionId,
      userId,
      tokenHash,
      csrfTokenHash,
      idleMinutes,
      absoluteHours,
      ipAddress,
      userAgent,
    ],
  )
  return sessionId
}

export const findActiveSession = async tokenHash => {
  const [rows] = await getMysqlPool().execute(
    `SELECT s.session_id, s.user_id, s.csrf_token_hash, s.created_at,
            s.last_seen_at, s.idle_expires_at, s.absolute_expires_at,
            u.username, u.display_name, u.organization_name, u.organization_type,
            u.role, u.status
       FROM auth_sessions s
       JOIN auth_users u ON u.user_id = s.user_id
      WHERE s.token_hash = ?
        AND s.revoked_at IS NULL
        AND s.idle_expires_at > CURRENT_TIMESTAMP(3)
        AND s.absolute_expires_at > CURRENT_TIMESTAMP(3)
        AND u.status = 'active'
      LIMIT 1`,
    [tokenHash],
  )
  return rows[0] || null
}

export const touchAuthSession = async (sessionId, idleMinutes) => {
  await getMysqlPool().execute(
    `UPDATE auth_sessions
        SET last_seen_at = CURRENT_TIMESTAMP(3),
            idle_expires_at = LEAST(
              DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? MINUTE),
              absolute_expires_at
            )
      WHERE session_id = ? AND revoked_at IS NULL`,
    [idleMinutes, sessionId],
  )
}

export const revokeAuthSession = async (sessionId, reason = 'logout') => {
  await getMysqlPool().execute(
    `UPDATE auth_sessions
        SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)),
            revoke_reason = CASE WHEN revoke_reason = '' THEN ? ELSE revoke_reason END
      WHERE session_id = ?`,
    [reason, sessionId],
  )
}

export const revokeUserSessions = async (userId, reason = 'account-change') => {
  await getMysqlPool().execute(
    `UPDATE auth_sessions
        SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)),
            revoke_reason = CASE WHEN revoke_reason = '' THEN ? ELSE revoke_reason END
      WHERE user_id = ? AND revoked_at IS NULL`,
    [reason, userId],
  )
}

export const writeAuthAudit = async ({
  userId = null,
  username = '',
  organizationName = '',
  action,
  resultStatus,
  projectId = null,
  resourceType = '',
  resourceId = '',
  requestId = '',
  ipAddress = '',
  userAgent = '',
  detail = {},
}) => {
  await getMysqlPool().execute(
    `INSERT INTO auth_audit_logs (
       audit_id, user_id, username, organization_name, action, result_status,
       project_id, resource_type, resource_id, request_id, ip_address, user_agent, detail_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      userId,
      username,
      organizationName,
      action,
      resultStatus,
      projectId,
      resourceType,
      resourceId,
      requestId,
      ipAddress,
      userAgent,
      jsonValue(detail),
    ],
  )
}

export const writeDownloadAudit = async ({
  userId = null,
  username = '',
  organizationName = '',
  projectId,
  downloadType,
  filters = {},
  fileName = '',
  resultStatus,
  rowCount = 0,
  requestId = '',
  ipAddress = '',
}) => {
  await getMysqlPool().execute(
    `INSERT INTO download_audit_logs (
       download_id, user_id, username, organization_name, project_id,
       download_type, filters_json, file_name, result_status, row_count,
       request_id, ip_address
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      userId,
      username,
      organizationName,
      projectId,
      downloadType,
      jsonValue(filters),
      fileName,
      resultStatus,
      rowCount,
      requestId,
      ipAddress,
    ],
  )
}

export const upsertAuthUser = async ({
  userId,
  username,
  passwordHash,
  displayName,
  organizationName,
  organizationType,
  role,
}) => {
  await getMysqlPool().execute(
    `INSERT INTO auth_users (
       user_id, username, password_hash, display_name, organization_name,
       organization_type, role, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       display_name = VALUES(display_name),
       organization_name = VALUES(organization_name),
       organization_type = VALUES(organization_type),
       role = VALUES(role),
       status = 'active',
       failed_login_count = 0,
       locked_until = NULL,
       password_changed_at = CURRENT_TIMESTAMP(3)`,
    [userId, username, passwordHash, displayName, organizationName, organizationType, role],
  )
}

export const bindAuthUserProject = async ({
  userId,
  projectId,
  canDownloadSummary,
  canDownloadDetail,
}) => {
  await getMysqlPool().execute(
    `INSERT INTO auth_user_projects (
       user_id, project_id, can_download_summary, can_download_detail
     ) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       can_download_summary = VALUES(can_download_summary),
       can_download_detail = VALUES(can_download_detail)`,
    [userId, projectId, canDownloadSummary ? 1 : 0, canDownloadDetail ? 1 : 0],
  )
}

export const setAuthUserStatus = async (username, status) => {
  const user = await findAuthUserByUsername(username)
  if (!user) return null
  await getMysqlPool().execute(
    `UPDATE auth_users
        SET status = ?, failed_login_count = 0, locked_until = NULL
      WHERE user_id = ?`,
    [status, user.user_id],
  )
  if (status !== 'active') await revokeUserSessions(user.user_id, `account-${status}`)
  return user
}
