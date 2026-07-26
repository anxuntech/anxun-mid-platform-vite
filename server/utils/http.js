import { randomUUID } from 'node:crypto'

export const sendJson = (response, statusCode, payload, headers = {}) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  response.end(JSON.stringify(payload))
}

export const sendText = (response, statusCode, body, headers = {}) => {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  response.end(body)
}

export const readRequestBody = (request, maxBytes = 64 * 1024) =>
  new Promise((resolve, reject) => {
    const chunks = []
    let totalLength = 0
    let settled = false

    request.on('data', chunk => {
      if (settled) return
      totalLength += chunk.length
      if (totalLength > maxBytes) {
        settled = true
        reject(new Error('payload-too-large'))
        request.resume()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (!settled) resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', error => {
      if (!settled) reject(error)
    })
  })

export const readJsonBody = async (request, maxBytes = 64 * 1024) => {
  const rawBody = await readRequestBody(request, maxBytes)
  if (!rawBody.trim()) return {}
  return JSON.parse(rawBody.replace(/^\uFEFF/, ''))
}

export const parseCookies = request => {
  const header = String(request.headers.cookie || '')
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const separator = part.indexOf('=')
        if (separator < 0) return [part, '']
        const key = part.slice(0, separator)
        const rawValue = part.slice(separator + 1)
        try {
          return [key, decodeURIComponent(rawValue)]
        } catch {
          return [key, '']
        }
      }),
  )
}

export const appendSetCookie = (response, value) => {
  const current = response.getHeader('Set-Cookie')
  const values = Array.isArray(current) ? current : current ? [current] : []
  response.setHeader('Set-Cookie', [...values, value])
}

export const serializeCookie = (name, value, {
  httpOnly = false,
  secure = true,
  sameSite = 'Lax',
  path = '/',
  maxAge,
} = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`]
  if (httpOnly) parts.push('HttpOnly')
  if (secure) parts.push('Secure')
  if (Number.isFinite(maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`)
  return parts.join('; ')
}

export const getClientIp = request => {
  const realIp = String(request.headers['x-real-ip'] || '').trim()
  const remoteAddress = String(request.socket?.remoteAddress || '').trim()
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const proxyIsLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress)
  return ((proxyIsLocal ? realIp || forwarded : '') || remoteAddress)
    .toString()
    .slice(0, 64)
}

export const getUserAgent = request => String(request.headers['user-agent'] || '').slice(0, 512)

export const getRequestId = request => {
  if (request.__anxunRequestId) return request.__anxunRequestId
  const supplied = String(request.headers['x-request-id'] || '').trim()
  request.__anxunRequestId = supplied ? supplied.slice(0, 128) : `req-${randomUUID()}`
  return request.__anxunRequestId
}
