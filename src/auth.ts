export type AuthRole = 'admin' | 'enterprise' | 'service' | 'insurer' | 'regulator'
export type AuthPage = 'login' | 'dashboard' | 'enterprises' | 'detail' | 'scoreDetail' | 'scoreTrend' | 'hazards' | 'devices' | 'tasks' | 'users' | 'bigscreen'

export type AuthAccount = {
  username: string
  password: string
  name: string
  role: AuthRole
  defaultPage: AuthPage
  enterpriseIds: string[]
}

export type AuthSession = {
  username: string
  name: string
  role: AuthRole
  defaultPage: AuthPage
  enterpriseIds: string[]
}

const STORAGE_KEY = 'anxun-auth-session-v1'

export const authAccounts: AuthAccount[] = [
  { username: 'admin', password: 'Anxun@2026', name: '平台管理员', role: 'admin', defaultPage: 'dashboard', enterpriseIds: [] },
  { username: 'ent_xintai01', password: 'Qiye@2026', name: '邢台新源注塑包装有限公司', role: 'enterprise', defaultPage: 'users', enterpriseIds: ['ent-002'] },
  { username: 'ent_hanglan01', password: 'Qiye@2026', name: '河北启航橡塑制品有限公司', role: 'enterprise', defaultPage: 'users', enterpriseIds: ['ent-007'] },
  { username: 'svc_team01', password: 'Fuwu@2026', name: '安巡服务团队一组', role: 'service', defaultPage: 'dashboard', enterpriseIds: ['ent-001', 'ent-002', 'ent-005', 'ent-007', 'ent-012'] },
  { username: 'ins_picc01', password: 'Baoxian@2026', name: '保险风控专员', role: 'insurer', defaultPage: 'scoreTrend', enterpriseIds: [] },
  { username: 'gov_emg01', password: 'Yingji@2026', name: '应急监管专员', role: 'regulator', defaultPage: 'bigscreen', enterpriseIds: [] },
]

export const roleLabelMap: Record<AuthRole, string> = {
  admin: '平台管理员',
  enterprise: '企业使用方',
  service: '执行与交付方',
  insurer: '风险查看方',
  regulator: '监管查看方',
}

export const rolePerspectiveMap: Record<AuthRole, '企业' | '安全服务商' | '保险平台' | '应急局'> = {
  admin: '保险平台',
  enterprise: '企业',
  service: '安全服务商',
  insurer: '保险平台',
  regulator: '应急局',
}

export const roleNavMap: Record<AuthRole, AuthPage[]> = {
  admin: ['dashboard', 'users', 'scoreTrend', 'bigscreen', 'enterprises', 'detail', 'scoreDetail', 'hazards', 'devices', 'tasks'],
  enterprise: ['users', 'detail', 'hazards', 'scoreDetail', 'devices', 'tasks'],
  service: ['dashboard', 'enterprises', 'detail', 'hazards', 'devices', 'tasks', 'scoreDetail'],
  insurer: ['scoreTrend', 'enterprises', 'detail', 'scoreDetail'],
  regulator: ['bigscreen', 'enterprises', 'detail', 'hazards', 'scoreDetail'],
}

export const findAccount = (username: string, password: string): AuthSession | null => {
  const account = authAccounts.find(item => item.username === username && item.password === password)
  if (!account) return null
  return {
    username: account.username,
    name: account.name,
    role: account.role,
    defaultPage: account.defaultPage,
    enterpriseIds: account.enterpriseIds,
  }
}

export const restoreSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthSession
    const matched = authAccounts.find(item => item.username === parsed.username && item.role === parsed.role)
    return matched
      ? {
          username: matched.username,
          name: matched.name,
          role: matched.role,
          defaultPage: matched.defaultPage,
          enterpriseIds: matched.enterpriseIds,
        }
      : null
  } catch {
    return null
  }
}

export const persistSession = (session: AuthSession) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export const clearSession = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
