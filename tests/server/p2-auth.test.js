import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'

import {
  hashOpaqueToken,
  hashPassword,
  newOpaqueToken,
  verifyPassword,
} from '../../server/services/authService.js'
import { projectAccess } from '../../server/security/sessionAuth.js'
import {
  consumeRequestRateLimit,
  resetRateLimitsForTests,
} from '../../server/security/rateLimit.js'
import { serializeCookie } from '../../server/utils/http.js'
import { getClientIp } from '../../server/utils/http.js'
import { buildPingxiangReportPdf } from '../../server/controllers/govPingxiangController.js'

const projectRoot = path.resolve(import.meta.dirname, '..', '..')
const serverEntry = path.join(projectRoot, 'server', 'index.js')

const reservePort = async () => {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  server.close()
  await once(server, 'close')
  return port
}

const waitForServer = async (baseUrl, child) => {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited before ready: ${child.exitCode}`)
    try {
      const response = await fetch(`${baseUrl}/api/caoliao/health`)
      if (response.ok) return
    } catch {
      // The process may still be binding the port.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('server did not become ready')
}

test('P2 migration creates only the authentication and audit foundation', async () => {
  const up = await readFile(path.join(projectRoot, 'database/migrations/005_p2_auth_foundation.up.sql'), 'utf8')
  const down = await readFile(path.join(projectRoot, 'database/migrations/005_p2_auth_foundation.down.sql'), 'utf8')
  for (const table of [
    'auth_users',
    'auth_user_projects',
    'auth_sessions',
    'auth_audit_logs',
    'download_audit_logs',
  ]) {
    assert.match(up, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
    assert.match(down, new RegExp(`DROP TABLE IF EXISTS ${table}`))
  }
  assert.match(up, /role IN \('admin', 'project_viewer'\)/)
  assert.match(up, /FOREIGN KEY \(project_id\) REFERENCES projects\(project_id\)/)
  assert.doesNotMatch(up, /ALTER TABLE (webhook_events|business_records|enterprises)/)
})

test('passwords and opaque session tokens are not stored in plaintext', async () => {
  const password = 'P2-test-password-only'
  const passwordHash = await hashPassword(password)
  assert.notEqual(passwordHash, password)
  assert.match(passwordHash, /^\$2[aby]\$/)
  assert.equal(await verifyPassword(password, passwordHash), true)
  assert.equal(await verifyPassword(`${password}-wrong`, passwordHash), false)

  const token = newOpaqueToken()
  assert.ok(token.length >= 40)
  assert.notEqual(hashOpaqueToken(token), token)
  assert.match(hashOpaqueToken(token), /^[a-f0-9]{64}$/)
})

test('session cookie is HttpOnly, Secure and SameSite=Lax', () => {
  const cookie = serializeCookie('anxun_session', 'opaque-token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 3600,
  })
  assert.match(cookie, /^anxun_session=opaque-token;/)
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Lax/)
  assert.match(cookie, /Max-Age=3600/)
})

test('project scope and download permissions are enforced server-side', () => {
  const viewer = {
    role: 'project_viewer',
    projects: [{
      projectId: 'pingxiang',
      canDownloadSummary: true,
      canDownloadDetail: false,
    }],
  }
  assert.ok(projectAccess(viewer, 'pingxiang', 'view'))
  assert.ok(projectAccess(viewer, 'pingxiang', 'download-summary'))
  assert.equal(projectAccess(viewer, 'pingxiang', 'download-detail'), null)
  assert.equal(projectAccess(viewer, 'ningjin', 'view'), null)

  const admin = {
    role: 'admin',
    projects: [{
      projectId: 'pingxiang',
      canDownloadSummary: true,
      canDownloadDetail: true,
    }],
  }
  assert.ok(projectAccess(admin, 'pingxiang', 'download-detail'))
})

test('request rate limits use the trusted client address and reset by window', () => {
  resetRateLimitsForTests()
  const request = {
    headers: {
      'x-real-ip': '203.0.113.10',
      'x-forwarded-for': '198.51.100.99',
    },
    socket: { remoteAddress: '127.0.0.1' },
  }
  assert.equal(consumeRequestRateLimit(request, 'test', { limit: 2 }).allowed, true)
  assert.equal(consumeRequestRateLimit(request, 'test', { limit: 2 }).allowed, true)
  const blocked = consumeRequestRateLimit(request, 'test', { limit: 2 })
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSeconds > 0)
  resetRateLimitsForTests()
})

test('proxy client headers are trusted only from the local reverse proxy', () => {
  assert.equal(getClientIp({
    headers: { 'x-real-ip': '203.0.113.10' },
    socket: { remoteAddress: '127.0.0.1' },
  }), '203.0.113.10')
  assert.equal(getClientIp({
    headers: { 'x-real-ip': '203.0.113.10' },
    socket: { remoteAddress: '198.51.100.20' },
  }), '198.51.100.20')
})

test('protected report export produces a valid PDF without demo fallback', async () => {
  const pdf = await buildPingxiangReportPdf({
    organizationName: '平乡县应急管理局',
    allowBuiltinFont: true,
    dashboard: {
      summary: {
        company_count: 1,
        hazard_count: 2,
        patrol_count: 3,
        work_permit_count: 4,
        training_count: 5,
        closed_hazard_count: 1,
      },
      companies: [{ company_name: '平乡县测试企业', industry: '机械制造' }],
      hazard_reports: [{}, {}],
      patrol_records: [{}, {}, {}],
      work_permits: [{}, {}, {}, {}],
      training_exam_records: [{}, {}, {}, {}, {}],
      warnings: [],
    },
  })
  assert.ok(Buffer.isBuffer(pdf))
  assert.equal(pdf.subarray(0, 4).toString('ascii'), '%PDF')
  assert.ok(pdf.length > 1_000)
})

test('frontend authentication contains no local account list or localStorage authority', async () => {
  const source = await readFile(path.join(projectRoot, 'src/auth.ts'), 'utf8')
  assert.doesNotMatch(source, /localStorage/)
  assert.doesNotMatch(source, /const\s+authAccounts|password\s*:\s*['"`]/)
  assert.doesNotMatch(source, /ent_xintai01|svc_team01|ins_picc01|gov_emg01/)
  assert.match(source, /\/api\/auth\/login/)
  assert.match(source, /\/api\/auth\/session/)
  assert.match(source, /credentials: 'same-origin'/)
})

test('protected Pingxiang data cannot fall back to JSONL raw events', async () => {
  const source = await readFile(path.join(projectRoot, 'server/services/govPingxiangDataService.js'), 'utf8')
  assert.doesNotMatch(source, /buildJsonlDashboard|govPingxiangDashboardService/)
  assert.match(source, /PINGXIANG_DATA_SOURCE/)
  assert.match(source, /buildPingxiangMysqlDashboardData/)
})

test('enterprise and four-business summary exports are separate protected routes', async () => {
  const routes = await readFile(path.join(projectRoot, 'server/routes/govPingxiangRoutes.js'), 'utf8')
  assert.match(routes, /exports\/summary/)
  assert.match(routes, /exports\/business-summary/)
  assert.match(routes, /exports\/company-detail/)
})

test('anonymous and untrusted requests cannot access protected production data', async t => {
  const port = await reservePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [serverEntry], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      WEBHOOK_PORT: String(port),
      MYSQL_WRITE_ENABLED: 'false',
      PINGXIANG_DATA_SOURCE: 'demo',
      AUTH_COOKIE_SECURE: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(async () => {
    if (child.exitCode === null) {
      child.kill()
      await Promise.race([
        once(child, 'exit'),
        new Promise(resolve => setTimeout(resolve, 2_000)),
      ])
    }
  })

  await waitForServer(baseUrl, child)

  const session = await fetch(`${baseUrl}/api/auth/session`)
  assert.equal(session.status, 401)
  assert.match(String(session.headers.get('set-cookie')), /anxun_session=/)

  const dashboard = await fetch(`${baseUrl}/api/gov/pingxiang/dashboard`)
  assert.equal(dashboard.status, 401)

  const company = await fetch(`${baseUrl}/api/gov/pingxiang/companies/px-company-001`)
  assert.equal(company.status, 401)

  const exportResponse = await fetch(`${baseUrl}/api/gov/pingxiang/exports/summary`, {
    method: 'POST',
  })
  assert.equal(exportResponse.status, 401)

  const rawEvents = await fetch(`${baseUrl}/api/caoliao/events`)
  assert.equal(rawEvents.status, 401)

  const untrustedPreflight = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://attacker.invalid' },
  })
  assert.equal(untrustedPreflight.status, 403)
  assert.equal(untrustedPreflight.headers.get('access-control-allow-origin'), null)
})
