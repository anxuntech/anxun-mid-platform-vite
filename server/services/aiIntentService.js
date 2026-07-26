const allowedIntents = new Set([
  'query_hazards',
  'query_unclosed_hazards',
  'query_inactive_companies',
  'query_inspections',
  'query_work_permits',
  'query_trainings',
  'company_summary',
  'project_summary',
  'compare_periods',
])

const allowedRootKeys = new Set(['intent', 'params'])
const allowedParamKeys = new Set([
  'companyId',
  'companyName',
  'status',
  'startDate',
  'endDate',
  'periodDays',
  'comparisonPeriodDays',
])

const text = (value, maxLength) => String(value || '').trim().slice(0, maxLength)
const integer = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

const isoDate = value => {
  const normalized = text(value, 10)
  if (!normalized) return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error('invalid-date')
  const date = new Date(`${normalized}T00:00:00+08:00`)
  if (Number.isNaN(date.getTime())) throw new Error('invalid-date')
  return normalized
}

export const validateAiIntent = raw => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid-intent-payload')
  const unknownRootKeys = Object.keys(raw).filter(key => !allowedRootKeys.has(key))
  if (unknownRootKeys.length) throw new Error('unknown-intent-field')
  const intent = text(raw.intent, 64)
  if (!allowedIntents.has(intent)) throw new Error('unsupported-intent')
  const rawParams = raw.params ?? {}
  if (!rawParams || typeof rawParams !== 'object' || Array.isArray(rawParams)) {
    throw new Error('invalid-intent-params')
  }
  const unknownParamKeys = Object.keys(rawParams).filter(key => !allowedParamKeys.has(key))
  if (unknownParamKeys.length) throw new Error('unknown-intent-param')
  const params = {
    companyId: text(rawParams.companyId, 64),
    companyName: text(rawParams.companyName, 191),
    status: text(rawParams.status, 64),
    startDate: isoDate(rawParams.startDate),
    endDate: isoDate(rawParams.endDate),
    periodDays: integer(rawParams.periodDays, 30, 1, 90),
    comparisonPeriodDays: integer(rawParams.comparisonPeriodDays, 30, 1, 90),
  }
  if (params.startDate && params.endDate) {
    const start = new Date(`${params.startDate}T00:00:00+08:00`)
    const end = new Date(`${params.endDate}T23:59:59+08:00`)
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
    if (days < 0 || days > 90) throw new Error('date-range-out-of-bounds')
  }
  return { intent, params }
}

const keywordRules = [
  ['query_unclosed_hazards', /未闭环|没有闭环|未整改|待整改|超期隐患/],
  ['query_hazards', /隐患|整改|闭环/],
  ['query_inactive_companies', /不活跃|没有记录|未运行|沉默企业/],
  ['query_inspections', /巡检|点检|检查/],
  ['query_work_permits', /作业票|作业审批|动火|有限空间/],
  ['query_trainings', /培训|考试|合格率/],
  ['company_summary', /企业概况|企业汇总|企业情况/],
  ['compare_periods', /环比|对比|相比|变化趋势/],
  ['project_summary', /项目概况|总体|总览|整体/],
]

export const fallbackIntentFromQuestion = (question, previous) => {
  const matched = keywordRules.find(([, pattern]) => pattern.test(question))
  const intent = matched?.[0] || previous?.intent || 'project_summary'
  return validateAiIntent({
    intent,
    params: {
      ...(previous?.params || {}),
      periodDays: 30,
      comparisonPeriodDays: 30,
    },
  })
}

export const assertSafeAiQuestion = question => {
  const normalized = text(question, 1000)
  if (!normalized) throw new Error('question-required')
  const blocked = [
    /忽略.{0,12}(指令|规则|限制)/i,
    /(system prompt|系统提示词|开发者指令)/i,
    /(数据库密码|连接串|accesskey|api[ _-]?key|密钥|token)/i,
    /(执行|运行).{0,12}(sql|命令|脚本)/i,
    /(drop|truncate|delete|update|insert|alter)\s+(table|from|into)/i,
    /(其他县|跨县|越权|绕过权限)/i,
  ]
  if (blocked.some(pattern => pattern.test(normalized))) throw new Error('unsafe-question')
  return normalized
}

export const redactAiQuestion = question => String(question || '')
  .replace(/sk-[a-z0-9_-]{12,}/gi, '[密钥已隐藏]')
  .replace(/(密码|口令|token|密钥)\s*[:：=]\s*\S+/gi, '$1：[已隐藏]')
  .replace(/1\d{10}/g, '1**********')
  .slice(0, 1000)

export const aiIntentNames = [...allowedIntents]
