import { createHash } from 'node:crypto'
import { countAiQueriesToday, writeAiQueryAudit } from '../repositories/aiQueryRepository.js'
import {
  auditDeniedAccess,
  projectAccess,
  requireRequestAuth,
  requireTrustedCsrf,
} from '../security/sessionAuth.js'
import { isTrustedOrigin } from '../security/originPolicy.js'
import { readBoolean } from '../config/runtimeConfig.js'
import {
  aiIntentNames,
  assertSafeAiQuestion,
  redactAiQuestion,
  validateAiIntent,
} from '../services/aiIntentService.js'
import { parseIntentWithDeepSeek } from '../services/deepseekIntentService.js'
import { executeControlledProjectQuery } from '../services/aiProjectQueryService.js'
import {
  getClientIp,
  getRequestId,
  readJsonBody,
  sendJson,
} from '../utils/http.js'

const hashQuestion = value => createHash('sha256').update(String(value || '')).digest('hex')

const config = () => ({
  enabled: readBoolean('P3_AI_ASSISTANT_ENABLED', false),
  adminOnly: readBoolean('P3_AI_ADMIN_ONLY', true),
  dailyLimit: Math.min(200, Math.max(1, Number(process.env.P3_AI_DAILY_LIMIT || 20))),
  sourceEnvironment: String(process.env.P3_AI_SOURCE_ENVIRONMENT || 'test').toLowerCase() === 'real'
    ? 'real'
    : 'test',
})

const safePrevious = value => {
  if (!value) return null
  try {
    return validateAiIntent(value)
  } catch {
    return null
  }
}

export const handleAiAssistantQuery = async (request, response, projectId) => {
  const startedAt = Date.now()
  const runtime = config()
  if (!runtime.enabled) {
    sendJson(response, 404, { success: false, message: '数据助手尚未启用' })
    return
  }
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!isTrustedOrigin(request)) {
    sendJson(response, 403, { success: false, message: '请求来源不受信任' })
    return
  }

  const auth = await requireRequestAuth(request, response)
  if (!auth) return
  const project = projectAccess(auth, projectId)
  if (!project) {
    await auditDeniedAccess({
      request,
      auth,
      projectId,
      resourceType: 'ai-assistant',
      resourceId: projectId,
    })
    sendJson(response, 403, { success: false, message: '当前账号无权访问该项目' })
    return
  }
  if (runtime.adminOnly && auth.role !== 'admin') {
    await auditDeniedAccess({
      request,
      auth,
      projectId,
      resourceType: 'ai-assistant',
      resourceId: 'admin-preview',
    })
    sendJson(response, 403, { success: false, message: '数据助手当前仅向平台管理员开放' })
    return
  }
  if (!requireTrustedCsrf(request, response, auth)) return

  let question = ''
  let parsedIntent = null
  let modelResult = { modelName: '', usage: {}, fallback: false, errorCode: '' }
  let resultStatus = 'failed'
  let resultCount = 0
  let errorCode = ''
  try {
    const body = await readJsonBody(request, 16 * 1024)
    const presetIntent = String(body.presetIntent || '').trim()
    if (presetIntent) {
      if (!aiIntentNames.includes(presetIntent)) throw new Error('unsupported-intent')
      parsedIntent = validateAiIntent({
        intent: presetIntent,
        params: body.params || {},
      })
      question = `快捷查询：${presetIntent}`
    } else {
      question = assertSafeAiQuestion(body.question)
    }

    const usedToday = await countAiQueriesToday(auth.userId)
    if (usedToday >= runtime.dailyLimit) {
      await writeAiQueryAudit({
        userId: auth.userId,
        username: auth.username,
        organizationName: auth.organizationName,
        projectId,
        questionRedacted: redactAiQuestion(question),
        questionHash: hashQuestion(question),
        intent: parsedIntent?.intent || '',
        queryScope: parsedIntent?.params || {},
        durationMs: Date.now() - startedAt,
        resultStatus: 'rate-limited',
        errorCode: 'daily-limit-reached',
        requestId: getRequestId(request),
        ipAddress: getClientIp(request),
      })
      sendJson(response, 429, {
        success: false,
        message: '今日数据助手使用次数已达上限，请明日再试',
      })
      return
    }

    if (!presetIntent) {
      modelResult = await parseIntentWithDeepSeek({
        question,
        previous: safePrevious(body.previous),
        projectName: project.projectName,
        countyName: project.countyName,
      })
      parsedIntent = modelResult.intent
    }

    const result = await executeControlledProjectQuery({
      projectId,
      parsedIntent,
      sourceEnvironment: runtime.sourceEnvironment,
    })
    resultCount = result.total
    resultStatus = modelResult.fallback ? 'model-fallback' : result.total ? 'success' : 'empty'
    errorCode = modelResult.errorCode || ''
    await writeAiQueryAudit({
      userId: auth.userId,
      username: auth.username,
      organizationName: auth.organizationName,
      projectId,
      questionRedacted: redactAiQuestion(question),
      questionHash: hashQuestion(question),
      intent: parsedIntent.intent,
      queryScope: result.scope,
      resultCount,
      durationMs: Date.now() - startedAt,
      modelName: modelResult.modelName,
      inputTokens: modelResult.usage.inputTokens,
      outputTokens: modelResult.usage.outputTokens,
      resultStatus,
      errorCode,
      requestId: getRequestId(request),
      ipAddress: getClientIp(request),
    })
    sendJson(response, 200, {
      success: true,
      ...result,
      modelFallback: modelResult.fallback,
      remainingToday: Math.max(0, runtime.dailyLimit - usedToday - 1),
      notice: '查询结果仅用于辅助研判，统计口径以页面标注和原始业务记录为准。',
    })
  } catch (error) {
    errorCode = String(error?.message || 'assistant-query-failed').slice(0, 64)
    await writeAiQueryAudit({
      userId: auth.userId,
      username: auth.username,
      organizationName: auth.organizationName,
      projectId,
      questionRedacted: redactAiQuestion(question),
      questionHash: hashQuestion(question),
      intent: parsedIntent?.intent || '',
      queryScope: parsedIntent?.params || {},
      resultCount,
      durationMs: Date.now() - startedAt,
      modelName: modelResult.modelName,
      inputTokens: modelResult.usage.inputTokens,
      outputTokens: modelResult.usage.outputTokens,
      resultStatus,
      errorCode,
      requestId: getRequestId(request),
      ipAddress: getClientIp(request),
    }).catch(() => {})
    const unsafe = ['unsafe-question', 'unsupported-intent', 'unknown-intent-field',
      'unknown-intent-param', 'invalid-intent-payload', 'invalid-intent-params',
      'invalid-date', 'date-range-out-of-bounds', 'question-required'].includes(errorCode)
    console.error('[p3:assistant] query failed', {
      requestId: getRequestId(request),
      projectId,
      errorCode,
    })
    sendJson(response, unsafe ? 400 : 503, {
      success: false,
      message: unsafe
        ? '问题包含不支持的查询内容，请使用企业、隐患、巡检、作业票或培训相关问题'
        : '数据助手暂时不可用，请稍后重试或使用快捷查询',
    })
  }
}
