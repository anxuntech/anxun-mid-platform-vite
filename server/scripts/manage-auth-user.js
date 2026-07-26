import { randomUUID } from 'node:crypto'
import { stdin } from 'node:process'
import {
  bindAuthUserProject,
  findAuthUserByUsername,
  revokeUserSessions,
  setAuthUserStatus,
  upsertAuthUser,
  writeAuthAudit,
} from '../repositories/authRepository.js'
import { closeMysqlPool } from '../db/mysql.js'
import { hashPassword, normalizeUsername } from '../services/authService.js'

const args = process.argv.slice(2)
const valueOf = name => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? String(args[index + 1] || '').trim() : ''
}
const hasFlag = name => args.includes(`--${name}`)

const readStdin = async () => {
  if (stdin.isTTY) return ''
  const chunks = []
  for await (const chunk of stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8').trim()
}

const action = valueOf('action') || 'create'
const username = normalizeUsername(valueOf('username'))

if (!username) throw new Error('missing --username')

try {
  if (action === 'disable' || action === 'enable') {
    const user = await setAuthUserStatus(username, action === 'enable' ? 'active' : 'disabled')
    if (!user) throw new Error('account-not-found')
    await writeAuthAudit({
      userId: user.user_id,
      username,
      organizationName: user.organization_name,
      action: action === 'enable' ? 'account-enable' : 'account-disable',
      resultStatus: 'success',
      resourceType: 'auth-user',
      resourceId: user.user_id,
      detail: { operator: 'maintenance-cli' },
    })
    console.log(`[auth:user] ${action}d username=${username}`)
    process.exitCode = 0
  } else if (action === 'create') {
    const displayName = valueOf('display-name')
    const organizationName = valueOf('organization')
    const organizationType = valueOf('organization-type')
    const role = valueOf('role')
    const projectId = valueOf('project') || 'pingxiang'
    const password = process.env.P2_ACCOUNT_PASSWORD || await readStdin()
    if (!displayName || !organizationName) throw new Error('display name and organization are required')
    if (!['anxun', 'government', 'insurer'].includes(organizationType)) {
      throw new Error('organization type must be anxun, government, or insurer')
    }
    if (!['admin', 'project_viewer'].includes(role)) {
      throw new Error('role must be admin or project_viewer')
    }
    if (
      password.length < 12 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new Error('password must contain upper, lower, number, special and at least 12 characters')
    }

    const existing = await findAuthUserByUsername(username)
    const userId = existing?.user_id || randomUUID()
    const passwordHash = await hashPassword(password)
    await upsertAuthUser({
      userId,
      username,
      passwordHash,
      displayName,
      organizationName,
      organizationType,
      role,
    })
    if (existing) await revokeUserSessions(userId, 'password-or-account-change')
    await bindAuthUserProject({
      userId,
      projectId,
      canDownloadSummary: !hasFlag('no-summary-download'),
      canDownloadDetail: role === 'admin' || hasFlag('allow-detail-download'),
    })
    await writeAuthAudit({
      userId,
      username,
      organizationName,
      action: existing ? 'account-update' : 'account-create',
      resultStatus: 'success',
      projectId,
      resourceType: 'auth-user',
      resourceId: userId,
      detail: { operator: 'maintenance-cli', role, organizationType },
    })
    console.log(
      `[auth:user] ready username=${username} role=${role} organizationType=${organizationType} project=${projectId}`,
    )
  } else {
    throw new Error('action must be create, enable, or disable')
  }
} finally {
  await closeMysqlPool()
}
