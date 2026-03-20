export type RoutePage =
  | 'dashboard'
  | 'enterprises'
  | 'detail'
  | 'scoreDetail'
  | 'scoreTrend'
  | 'scoreConfig'
  | 'hazards'
  | 'devices'
  | 'tasks'
  | 'users'
  | 'bigscreen'

export type RouteTaskScope = 'all' | 'today' | 'weekCompleted' | 'monthly'
export type RouteHazardScope = 'all' | 'pendingReview' | 'overdueOpen'
export type RouteTaskStatus = '待执行' | '执行中' | '已发现隐患' | '待整改' | '待复查' | '已闭环' | '已超期'
export type RouteTaskPriority = '高' | '中' | '低'
export type RouteTaskTimeFilter = 'all' | 'last7days' | 'thisMonth' | 'next7days'
export type RouteTaskQuickFilter = 'all' | 'overdue' | 'pendingReview'

export type NavigationState = {
  page: RoutePage
  enterpriseId?: string
  taskId?: string
  taskListScope?: RouteTaskScope
  hazardListScope?: RouteHazardScope
  hazardEnterpriseId?: string
  taskEnterpriseFilter?: string
  taskTypeFilter?: string
  taskStatusFilter?: RouteTaskStatus | 'all'
  taskPriorityFilter?: RouteTaskPriority | 'all'
  taskTimeFilter?: RouteTaskTimeFilter
  taskAssigneeFilter?: string
  taskQuickFilter?: RouteTaskQuickFilter
  selectedMonth?: string
  detailSnapshotMonth?: string
}

const workspacePathMap: Record<Exclude<RoutePage, 'dashboard' | 'tasks' | 'enterprises' | 'detail' | 'hazards'>, string> = {
  scoreDetail: '/workspace/score-detail',
  scoreTrend: '/workspace/score-trend',
  scoreConfig: '/workspace/score-config',
  devices: '/workspace/devices',
  users: '/workspace/users',
  bigscreen: '/workspace/bigscreen',
}

const workspaceSlugMap = Object.fromEntries(Object.entries(workspacePathMap).map(([page, path]) => [path.replace('/workspace/', ''), page as RoutePage]))

const addParam = (params: URLSearchParams, key: string, value?: string) => {
  if (value && value !== 'all') params.set(key, value)
}

const parseLegacyPage = (value: string | null): RoutePage => {
  if (value === 'dashboard' || value === 'tasks' || value === 'enterprises' || value === 'detail' || value === 'scoreDetail' || value === 'scoreTrend' || value === 'scoreConfig' || value === 'hazards' || value === 'devices' || value === 'users' || value === 'bigscreen') {
    return value
  }
  return 'dashboard'
}

export const buildAppHref = (route: NavigationState): string => {
  const params = new URLSearchParams()
  let pathname = '/dashboard'

  if (route.page === 'dashboard') {
    pathname = '/dashboard'
  } else if (route.page === 'tasks') {
    pathname = '/tasks'
    addParam(params, 'taskId', route.taskId)
    addParam(params, 'scope', route.taskListScope)
    addParam(params, 'enterprise', route.taskEnterpriseFilter)
    addParam(params, 'type', route.taskTypeFilter)
    addParam(params, 'status', route.taskStatusFilter)
    addParam(params, 'priority', route.taskPriorityFilter)
    addParam(params, 'timeRange', route.taskTimeFilter)
    addParam(params, 'assignee', route.taskAssigneeFilter)
    addParam(params, 'quick', route.taskQuickFilter)
  } else if (route.page === 'enterprises') {
    pathname = '/enterprises'
  } else if (route.page === 'detail') {
    pathname = route.enterpriseId ? `/enterprises/${route.enterpriseId}` : '/enterprises'
    addParam(params, 'month', route.selectedMonth)
    addParam(params, 'snapshot', route.detailSnapshotMonth || undefined)
  } else if (route.page === 'hazards') {
    pathname = '/hazards'
    addParam(params, 'enterpriseId', route.enterpriseId)
    addParam(params, 'scope', route.hazardListScope)
    addParam(params, 'hazardEnterpriseId', route.hazardEnterpriseId)
  } else {
    pathname = workspacePathMap[route.page]
    addParam(params, 'enterpriseId', route.enterpriseId)
    addParam(params, 'month', route.selectedMonth)
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

const parseLegacyState = (params: URLSearchParams): NavigationState | null => {
  const hasLegacyMarker = params.get('app') === 'safe-platform' || params.has('page')
  if (!hasLegacyMarker) return null
  return {
    page: parseLegacyPage(params.get('page')),
    enterpriseId: params.get('enterpriseId') || undefined,
    taskId: params.get('taskId') || undefined,
    taskListScope: (params.get('taskListScope') as RouteTaskScope | null) || undefined,
    hazardListScope: (params.get('hazardListScope') as RouteHazardScope | null) || undefined,
    hazardEnterpriseId: params.get('hazardEnterpriseId') || undefined,
    taskEnterpriseFilter: params.get('taskEnterpriseFilter') || undefined,
    taskTypeFilter: params.get('taskTypeFilter') || undefined,
    taskStatusFilter: (params.get('taskStatusFilter') as RouteTaskStatus | 'all' | null) || undefined,
    taskPriorityFilter: (params.get('taskPriorityFilter') as RouteTaskPriority | 'all' | null) || undefined,
    taskTimeFilter: (params.get('taskTimeFilter') as RouteTaskTimeFilter | null) || undefined,
    taskAssigneeFilter: params.get('taskAssigneeFilter') || undefined,
    taskQuickFilter: (params.get('taskQuickFilter') as RouteTaskQuickFilter | null) || undefined,
    selectedMonth: params.get('selectedMonth') || undefined,
    detailSnapshotMonth: params.get('detailSnapshotMonth') || undefined,
  }
}

export const parseAppLocation = (pathname: string, search: string): NavigationState => {
  const params = new URLSearchParams(search)
  const legacyState = parseLegacyState(params)
  if (legacyState) return legacyState

  if (pathname === '/' || pathname === '/dashboard') return { page: 'dashboard' }
  if (pathname === '/tasks') {
    return {
      page: 'tasks',
      taskId: params.get('taskId') || undefined,
      taskListScope: (params.get('scope') as RouteTaskScope | null) || undefined,
      taskEnterpriseFilter: params.get('enterprise') || undefined,
      taskTypeFilter: params.get('type') || undefined,
      taskStatusFilter: (params.get('status') as RouteTaskStatus | 'all' | null) || undefined,
      taskPriorityFilter: (params.get('priority') as RouteTaskPriority | 'all' | null) || undefined,
      taskTimeFilter: (params.get('timeRange') as RouteTaskTimeFilter | null) || undefined,
      taskAssigneeFilter: params.get('assignee') || undefined,
      taskQuickFilter: (params.get('quick') as RouteTaskQuickFilter | null) || undefined,
    }
  }
  if (pathname === '/enterprises') return { page: 'enterprises' }
  if (pathname.startsWith('/enterprises/')) {
    const enterpriseId = pathname.replace('/enterprises/', '')
    return {
      page: 'detail',
      enterpriseId: enterpriseId || undefined,
      selectedMonth: params.get('month') || undefined,
      detailSnapshotMonth: params.get('snapshot') || undefined,
    }
  }
  if (pathname === '/hazards') {
    return {
      page: 'hazards',
      enterpriseId: params.get('enterpriseId') || undefined,
      hazardListScope: (params.get('scope') as RouteHazardScope | null) || undefined,
      hazardEnterpriseId: params.get('hazardEnterpriseId') || undefined,
    }
  }
  if (pathname.startsWith('/workspace/')) {
    const slug = pathname.replace('/workspace/', '')
    const page = workspaceSlugMap[slug] || 'dashboard'
    return {
      page,
      enterpriseId: params.get('enterpriseId') || undefined,
      selectedMonth: params.get('month') || undefined,
    }
  }
  return { page: 'dashboard' }
}
