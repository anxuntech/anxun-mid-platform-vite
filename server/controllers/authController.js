import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  authCookieSecure,
  authenticateRequest,
  login,
  logout,
} from '../services/authService.js'
import { isTrustedOrigin } from '../security/originPolicy.js'
import { consumeRequestRateLimit } from '../security/rateLimit.js'
import {
  appendSetCookie,
  readJsonBody,
  sendJson,
  serializeCookie,
} from '../utils/http.js'
import { requireTrustedCsrf } from '../security/sessionAuth.js'

const setSessionCookies = (response, result) => {
  const options = {
    secure: authCookieSecure(),
    sameSite: 'Lax',
    path: '/',
    maxAge: result.maxAgeSeconds,
  }
  appendSetCookie(response, serializeCookie(AUTH_COOKIE_NAME, result.sessionToken, {
    ...options,
    httpOnly: true,
  }))
  appendSetCookie(response, serializeCookie(CSRF_COOKIE_NAME, result.csrfToken, options))
}

const clearSessionCookies = response => {
  const options = { secure: authCookieSecure(), sameSite: 'Lax', path: '/', maxAge: 0 }
  appendSetCookie(response, serializeCookie(AUTH_COOKIE_NAME, '', { ...options, httpOnly: true }))
  appendSetCookie(response, serializeCookie(CSRF_COOKIE_NAME, '', options))
}

export const handleLogin = async (request, response) => {
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!isTrustedOrigin(request)) {
    sendJson(response, 403, { success: false, message: '请求来源不受信任' })
    return
  }
  const rateLimit = consumeRequestRateLimit(request, 'auth-login', {
    limit: process.env.AUTH_LOGIN_RATE_LIMIT || 10,
    windowMs: 15 * 60 * 1000,
  })
  if (!rateLimit.allowed) {
    sendJson(response, 429, {
      success: false,
      message: '登录尝试过于频繁，请稍后重试',
    }, { 'Retry-After': String(rateLimit.retryAfterSeconds) })
    return
  }

  try {
    const body = await readJsonBody(request, 16 * 1024)
    const result = await login({
      request,
      username: body.username,
      password: body.password,
    })
    if (!result) {
      sendJson(response, 401, { success: false, message: '账号或密码不正确，请检查后重试' })
      return
    }
    setSessionCookies(response, result)
    sendJson(response, 200, { success: true, session: result.session })
  } catch (error) {
    console.error('[auth] login failed', error)
    const badRequest = ['payload-too-large', 'Unexpected token'].some(value =>
      String(error?.message || '').includes(value))
    sendJson(response, badRequest ? 400 : 503, {
      success: false,
      message: badRequest ? '登录请求格式不正确' : '登录服务暂不可用，请稍后重试',
    })
  }
}

export const handleSession = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      clearSessionCookies(response)
      sendJson(response, 401, { success: false, message: '登录状态已失效' })
      return
    }
    const { csrfTokenHash: _csrfTokenHash, sessionId: _sessionId, ...session } = auth
    sendJson(response, 200, { success: true, session })
  } catch (error) {
    console.error('[auth] session lookup failed', error)
    sendJson(response, 503, { success: false, message: '登录状态暂时无法确认' })
  }
}

export const handleLogout = async (request, response) => {
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }
  if (!isTrustedOrigin(request)) {
    sendJson(response, 403, { success: false, message: '请求来源不受信任' })
    return
  }
  try {
    const auth = await authenticateRequest(request)
    if (auth && !requireTrustedCsrf(request, response, auth)) return
    await logout({ request, auth })
    clearSessionCookies(response)
    sendJson(response, 200, { success: true, message: '已退出登录' })
  } catch (error) {
    console.error('[auth] logout failed', error)
    clearSessionCookies(response)
    sendJson(response, 200, { success: true, message: '已退出登录' })
  }
}
