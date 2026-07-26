import { aiIntentNames, fallbackIntentFromQuestion, validateAiIntent } from './aiIntentService.js'

const buildPrompt = ({ projectName, countyName, question, previous }) => ({
  model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  temperature: 0,
  max_tokens: Math.min(800, Math.max(128, Number(process.env.P3_AI_MAX_OUTPUT_TOKENS || 400))),
  response_format: { type: 'json_object' },
  messages: [
    {
      role: 'system',
      content: `你是政务安全数据助手的意图解析器，只输出 JSON，不回答问题、不生成 SQL、不请求数据。
允许 intent：${aiIntentNames.join(', ')}。
JSON 格式严格为：
{"intent":"project_summary","params":{"companyId":"","companyName":"","status":"","startDate":"","endDate":"","periodDays":30,"comparisonPeriodDays":30}}
只能使用上述字段。时间范围最长 90 天。无法判断时使用 project_summary。
当前授权项目：${projectName}；县域：${countyName}。不得选择或推断其他项目、县域。`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        question,
        previous: previous || null,
      }),
    },
  ],
})

export const parseIntentWithDeepSeek = async input => {
  const apiKey = String(process.env.DEEPSEEK_API_KEY || '').trim()
  if (!apiKey) {
    return {
      intent: fallbackIntentFromQuestion(input.question, input.previous),
      modelName: '',
      usage: {},
      fallback: true,
      errorCode: 'model-key-unavailable',
    }
  }

  const timeoutMs = Math.min(20_000, Math.max(2_000, Number(process.env.P3_AI_TIMEOUT_MS || 12_000)))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const body = buildPrompt(input)
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`deepseek-http-${response.status}`)
    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (!content) throw new Error('deepseek-empty-content')
    return {
      intent: validateAiIntent(JSON.parse(content)),
      modelName: String(payload.model || body.model).slice(0, 64),
      usage: {
        inputTokens: Number(payload.usage?.prompt_tokens || 0),
        outputTokens: Number(payload.usage?.completion_tokens || 0),
      },
      fallback: false,
      errorCode: '',
    }
  } catch (error) {
    return {
      intent: fallbackIntentFromQuestion(input.question, input.previous),
      modelName: '',
      usage: {},
      fallback: true,
      errorCode: error?.name === 'AbortError' ? 'model-timeout' : 'model-unavailable',
    }
  } finally {
    clearTimeout(timer)
  }
}
