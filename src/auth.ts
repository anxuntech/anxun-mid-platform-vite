export type AuthRole = 'admin' | 'project_viewer'
export type OrganizationType = 'anxun' | 'government' | 'insurer'
export type AuthPage = 'login' | 'pingxiangGov' | 'dashboard' | 'enterprises' | 'detail' | 'scoreDetail' | 'scoreTrend' | 'hazards' | 'devices' | 'tasks' | 'users' | 'bigscreen'

export type AuthProject = {
  projectId: string
  projectSlug: string
  projectName: string
  countyId: string
  countySlug: string
  countyName: string
  canDownloadSummary: boolean
  canDownloadDetail: boolean
}

export type AuthSession = {
  userId: string
  username: string
  displayName: string
  name: string
  organizationName: string
  organizationType: OrganizationType
  role: AuthRole
  projects: AuthProject[]
  defaultPage: AuthPage
  enterpriseIds: string[]
}

type SessionResponse = {
  success: boolean
  session?: Omit<AuthSession, 'name' | 'defaultPage' | 'enterpriseIds'>
  message?: string
}

const normalizeSession = (session: SessionResponse['session']): AuthSession | null => {
  if (!session) return null
  const defaultPage: AuthPage =
    session.role === 'admin'
      ? 'dashboard'
      : 'pingxiangGov'
  return {
    ...session,
    name: session.displayName,
    defaultPage,
    enterpriseIds: [],
  }
}

const requestJson = async (url: string, init: RequestInit = {}) => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({})) as SessionResponse
  if (!response.ok) throw new Error(payload.message || '认证服务暂不可用')
  return payload
}

const readCookie = (name: string) => {
  if (typeof document === 'undefined') return ''
  const prefix = `${name}=`
  const item = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix))
  if (!item) return ''
  try {
    return decodeURIComponent(item.slice(prefix.length))
  } catch {
    return ''
  }
}

export const authenticatedFetch = (url: string, init: RequestInit = {}) => {
  const method = String(init.method || 'GET').toUpperCase()
  const csrfToken = method === 'GET' || method === 'HEAD' ? '' : readCookie('anxun_csrf')
  return fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: {
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(init.headers || {}),
    },
  })
}

export const restoreSession = async (): Promise<AuthSession | null> => {
  try {
    const payload = await requestJson('/api/auth/session')
    return normalizeSession(payload.session)
  } catch {
    return null
  }
}

export const loginAccount = async (username: string, password: string): Promise<AuthSession> => {
  const payload = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const session = normalizeSession(payload.session)
  if (!session) throw new Error('登录状态返回异常')
  return session
}

export const clearSession = async () => {
  const csrfToken = readCookie('anxun_csrf')
  await requestJson('/api/auth/logout', {
    method: 'POST',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
  }).catch(() => null)
}

export const roleLabelForSession = (session: AuthSession | null) => {
  if (!session) return '未登录'
  if (session.role === 'admin') return '安巡管理员'
  if (session.organizationType === 'government') return '政府项目查看者'
  if (session.organizationType === 'insurer') return '保险项目查看者'
  return '项目查看者'
}

export const perspectiveForSession = (session: AuthSession | null): '企业' | '安全服务商' | '保险平台' | '应急局' => {
  if (!session) return '安全服务商'
  if (session.organizationType === 'government') return '应急局'
  if (session.organizationType === 'insurer') return '保险平台'
  return '安全服务商'
}

export const pagesForSession = (session: AuthSession): AuthPage[] => {
  if (session.role === 'admin') {
    return ['dashboard', 'users', 'scoreTrend', 'bigscreen', 'enterprises', 'detail', 'scoreDetail', 'hazards', 'devices', 'tasks']
  }
  return ['pingxiangGov']
}
