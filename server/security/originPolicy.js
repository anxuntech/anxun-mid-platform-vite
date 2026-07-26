const defaultProductionOrigins = ['https://axsztech.cn', 'https://www.axsztech.cn']

const configuredOrigins = () => {
  const configured = String(process.env.AUTH_TRUSTED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  if (configured.length) return new Set(configured)
  return new Set(process.env.NODE_ENV === 'production' ? defaultProductionOrigins : [
    ...defaultProductionOrigins,
    'http://127.0.0.1:4173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
  ])
}

export const isTrustedOrigin = request => {
  const origin = String(request.headers.origin || '').trim()
  if (!origin) return process.env.NODE_ENV !== 'production'
  return configuredOrigins().has(origin)
}

export const applyCorsHeaders = (request, response) => {
  const origin = String(request.headers.origin || '').trim()
  if (origin && configuredOrigins().has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Anxun-Internal-Key, X-Anxun-Webhook-Secret, X-CSRF-Token, X-Request-Id',
  )
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

export const applySecurityHeaders = response => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'")
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('X-Frame-Options', 'SAMEORIGIN')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}
