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
  selectedHazardId?: string
  hazardLevelFilter?: string
  hazardStatusFilter?: string
  hazardReviewFilter?: string
  hazardOverdueFilter?: string
  hazardTimeFilter?: string
  hazardKeyword?: string
  hazardQuickFilter?: string
  selectedSnapshotId?: string
  snapshotEnterpriseFilter?: string
  snapshotRiskFilter?: string
  selectedRecordId?: string
  recordEnterpriseFilter?: string
  recordTypeFilter?: string
  recordExecutorFilter?: string
  recordTimeFilter?: string
  recordStatusFilter?: string
  recordQuickFilter?: string
  insurerAreaFilter?: string
  insurerIndustryFilter?: string
  insurerTierFilter?: string
  regulatorAreaFilter?: string
  regulatorIndustryFilter?: string
  regulatorStatusFilter?: string
}

const workspacePathMap: Record<Exclude<RoutePage, 'dashboard' | 'tasks' | 'enterprises' | 'detail' | 'hazards' | 'scoreDetail' | 'devices'>, string> = {
  scoreTrend: '/insurer',
  scoreConfig: '/workspace/score-config',
  users: '/enterprise-home',
  bigscreen: '/regulator',
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
    addParam(params, 'snapshot', route.detailSnapshotMonth)
  } else if (route.page === 'hazards') {
    pathname = '/hazards'
    addParam(params, 'enterpriseId', route.enterpriseId)
    addParam(params, 'scope', route.hazardListScope)
    addParam(params, 'hazardEnterpriseId', route.hazardEnterpriseId)
    addParam(params, 'hazardId', route.selectedHazardId)
    addParam(params, 'level', route.hazardLevelFilter)
    addParam(params, 'status', route.hazardStatusFilter)
    addParam(params, 'review', route.hazardReviewFilter)
    addParam(params, 'overdue', route.hazardOverdueFilter)
    addParam(params, 'timeRange', route.hazardTimeFilter)
    addParam(params, 'keyword', route.hazardKeyword)
    addParam(params, 'quick', route.hazardQuickFilter)
  } else if (route.page === 'scoreDetail') {
    pathname = '/snapshots'
    addParam(params, 'month', route.selectedMonth)
    addParam(params, 'enterprise', route.snapshotEnterpriseFilter)
    addParam(params, 'risk', route.snapshotRiskFilter)
    addParam(params, 'snapshotId', route.selectedSnapshotId)
  } else if (route.page === 'devices') {
    pathname = '/records'
    addParam(params, 'recordId', route.selectedRecordId)
    addParam(params, 'enterprise', route.recordEnterpriseFilter)
    addParam(params, 'type', route.recordTypeFilter)
    addParam(params, 'executor', route.recordExecutorFilter)
    addParam(params, 'timeRange', route.recordTimeFilter)
    addParam(params, 'status', route.recordStatusFilter)
    addParam(params, 'quick', route.recordQuickFilter)
    addParam(params, 'month', route.selectedMonth)
  } else if (route.page === 'users') {
    pathname = '/enterprise-home'
    addParam(params, 'enterpriseId', route.enterpriseId)
    addParam(params, 'month', route.selectedMonth)
  } else if (route.page === 'scoreTrend') {
    pathname = '/insurer'
    addParam(params, 'month', route.selectedMonth)
    addParam(params, 'area', route.insurerAreaFilter)
    addParam(params, 'industry', route.insurerIndustryFilter)
    addParam(params, 'tier', route.insurerTierFilter)
  } else if (route.page === 'bigscreen') {
    pathname = '/regulator'
    addParam(params, 'month', route.selectedMonth)
    addParam(params, 'area', route.regulatorAreaFilter)
    addParam(params, 'industry', route.regulatorIndustryFilter)
    addParam(params, 'status', route.regulatorStatusFilter)
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
    selectedHazardId: params.get('selectedHazardId') || undefined,
    hazardLevelFilter: params.get('hazardLevelFilter') || undefined,
    hazardStatusFilter: params.get('hazardStatusFilter') || undefined,
    hazardReviewFilter: params.get('hazardReviewFilter') || undefined,
    hazardOverdueFilter: params.get('hazardOverdueFilter') || undefined,
    hazardTimeFilter: params.get('hazardTimeFilter') || undefined,
    hazardKeyword: params.get('hazardKeyword') || undefined,
    hazardQuickFilter: params.get('hazardQuickFilter') || undefined,
    selectedSnapshotId: params.get('selectedSnapshotId') || undefined,
    snapshotEnterpriseFilter: params.get('snapshotEnterpriseFilter') || undefined,
    snapshotRiskFilter: params.get('snapshotRiskFilter') || undefined,
    selectedRecordId: params.get('selectedRecordId') || undefined,
    recordEnterpriseFilter: params.get('recordEnterpriseFilter') || undefined,
    recordTypeFilter: params.get('recordTypeFilter') || undefined,
    recordExecutorFilter: params.get('recordExecutorFilter') || undefined,
    recordTimeFilter: params.get('recordTimeFilter') || undefined,
    recordStatusFilter: params.get('recordStatusFilter') || undefined,
    recordQuickFilter: params.get('recordQuickFilter') || undefined,
    insurerAreaFilter: params.get('insurerAreaFilter') || undefined,
    insurerIndustryFilter: params.get('insurerIndustryFilter') || undefined,
    insurerTierFilter: params.get('insurerTierFilter') || undefined,
    regulatorAreaFilter: params.get('regulatorAreaFilter') || undefined,
    regulatorIndustryFilter: params.get('regulatorIndustryFilter') || undefined,
    regulatorStatusFilter: params.get('regulatorStatusFilter') || undefined,
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
      selectedHazardId: params.get('hazardId') || undefined,
      hazardLevelFilter: params.get('level') || undefined,
      hazardStatusFilter: params.get('status') || undefined,
      hazardReviewFilter: params.get('review') || undefined,
      hazardOverdueFilter: params.get('overdue') || undefined,
      hazardTimeFilter: params.get('timeRange') || undefined,
      hazardKeyword: params.get('keyword') || undefined,
      hazardQuickFilter: params.get('quick') || undefined,
    }
  }
  if (pathname === '/snapshots' || pathname === '/workspace/score-detail') {
    return {
      page: 'scoreDetail',
      selectedMonth: params.get('month') || undefined,
      snapshotEnterpriseFilter: params.get('enterprise') || undefined,
      snapshotRiskFilter: params.get('risk') || undefined,
      selectedSnapshotId: params.get('snapshotId') || undefined,
    }
  }
  if (pathname === '/records' || pathname === '/workspace/devices') {
    return {
      page: 'devices',
      selectedRecordId: params.get('recordId') || undefined,
      recordEnterpriseFilter: params.get('enterprise') || undefined,
      recordTypeFilter: params.get('type') || undefined,
      recordExecutorFilter: params.get('executor') || undefined,
      recordTimeFilter: params.get('timeRange') || undefined,
      recordStatusFilter: params.get('status') || undefined,
      recordQuickFilter: params.get('quick') || undefined,
      selectedMonth: params.get('month') || undefined,
    }
  }
  if (pathname === '/enterprise-home' || pathname === '/workspace/users') {
    return {
      page: 'users',
      enterpriseId: params.get('enterpriseId') || undefined,
      selectedMonth: params.get('month') || undefined,
    }
  }
  if (pathname === '/insurer' || pathname === '/workspace/score-trend') {
    return {
      page: 'scoreTrend',
      selectedMonth: params.get('month') || undefined,
      insurerAreaFilter: params.get('area') || undefined,
      insurerIndustryFilter: params.get('industry') || undefined,
      insurerTierFilter: params.get('tier') || undefined,
    }
  }
  if (pathname === '/regulator' || pathname === '/workspace/bigscreen') {
    return {
      page: 'bigscreen',
      selectedMonth: params.get('month') || undefined,
      regulatorAreaFilter: params.get('area') || undefined,
      regulatorIndustryFilter: params.get('industry') || undefined,
      regulatorStatusFilter: params.get('status') || undefined,
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
