import { getClientIp } from '../utils/http.js'

const windows = new Map()
const maxTrackedWindows = 5_000

const positiveInteger = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export const consumeRequestRateLimit = (
  request,
  bucket,
  {
    limit = 120,
    windowMs = 60_000,
  } = {},
) => {
  const now = Date.now()
  const safeLimit = positiveInteger(limit, 120)
  const safeWindowMs = positiveInteger(windowMs, 60_000)
  const key = `${bucket}:${getClientIp(request) || 'unknown'}`
  const current = windows.get(key)

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + safeWindowMs })
    return { allowed: true, remaining: safeLimit - 1, retryAfterSeconds: 0 }
  }

  current.count += 1
  if (windows.size > maxTrackedWindows) {
    for (const [entryKey, value] of windows) {
      if (value.resetAt <= now) windows.delete(entryKey)
    }
    while (windows.size > maxTrackedWindows) {
      windows.delete(windows.keys().next().value)
    }
  }

  return {
    allowed: current.count <= safeLimit,
    remaining: Math.max(0, safeLimit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

export const resetRateLimitsForTests = () => {
  windows.clear()
}
