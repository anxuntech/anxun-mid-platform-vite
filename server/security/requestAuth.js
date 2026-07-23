import { timingSafeEqual } from 'node:crypto'
import { getRuntimeConfig } from '../config/runtimeConfig.js'

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

const bearerToken = request => {
  const authorization = String(request.headers.authorization || '')
  return authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : ''
}

export const verifyWebhookRequest = request => {
  const { webhookAuthRequired, webhookSecret } = getRuntimeConfig()
  if (!webhookAuthRequired) return { accepted: true, mode: 'compatibility' }
  if (!webhookSecret) return { accepted: false, reason: 'webhook-secret-not-configured' }

  const url = new URL(request.url, 'http://localhost')
  const supplied =
    request.headers['x-anxun-webhook-secret'] ||
    bearerToken(request) ||
    url.searchParams.get('token') ||
    ''
  return safeEqual(supplied, webhookSecret)
    ? { accepted: true, mode: 'required' }
    : { accepted: false, reason: 'webhook-auth-failed' }
}

export const verifyInternalDataRequest = request => {
  const remoteAddress = String(request.socket?.remoteAddress || '')
  const forwardedFor = request.headers['x-forwarded-for'] || request.headers['x-real-ip']
  const { internalDataApiKey, internalDataAllowLoopback } = getRuntimeConfig()
  if (
    internalDataAllowLoopback &&
    !forwardedFor &&
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress)
  ) {
    return { accepted: true, mode: 'loopback' }
  }

  if (!internalDataApiKey) return { accepted: false, reason: 'internal-api-key-not-configured' }
  const supplied = request.headers['x-anxun-internal-key'] || bearerToken(request)
  return safeEqual(supplied, internalDataApiKey)
    ? { accepted: true, mode: 'key' }
    : { accepted: false, reason: 'internal-api-auth-failed' }
}
