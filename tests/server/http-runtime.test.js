import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'

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
    if (child.exitCode !== null) {
      throw new Error(`server exited before becoming ready: ${child.exitCode}`)
    }
    try {
      const response = await fetch(`${baseUrl}/api/caoliao/health`)
      if (response.ok) return
    } catch {
      // The child process may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('server did not become ready')
}

test('runtime HTTP boundaries protect real data and keep webhook acknowledgement stable', async t => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'anxun-p1-http-'))
  const port = await reservePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const webhookSecret = 'runtime-webhook-secret'
  const internalKey = 'runtime-internal-key'
  const output = []

  const child = spawn(process.execPath, [serverEntry], {
    cwd: tempDirectory,
    env: {
      ...process.env,
      WEBHOOK_PORT: String(port),
      WEBHOOK_AUTH_REQUIRED: 'true',
      CAOLIAO_WEBHOOK_SECRET: webhookSecret,
      INTERNAL_DATA_API_KEY: internalKey,
      INTERNAL_DATA_ALLOW_LOOPBACK: 'false',
      MYSQL_WRITE_ENABLED: 'false',
      PINGXIANG_DATA_SOURCE: 'demo',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', chunk => output.push(chunk.toString()))
  child.stderr.on('data', chunk => output.push(chunk.toString()))

  t.after(async () => {
    if (child.exitCode === null) {
      child.kill()
      await Promise.race([
        once(child, 'exit'),
        new Promise(resolve => setTimeout(resolve, 2_000)),
      ])
    }
    await rm(tempDirectory, { recursive: true, force: true })
  })

  await waitForServer(baseUrl, child)

  const payload = {
    ref_data: {
      form: { name: '平乡巡检记录', number: 'D108' },
      fields: [{ name: '检查结果', value: '正常' }],
    },
  }
  const rejectedResponse = await fetch(`${baseUrl}/api/caoliao/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  assert.equal(rejectedResponse.status, 200)
  assert.deepEqual(await rejectedResponse.json(), { success: true, message: 'received' })

  const acceptedResponse = await fetch(`${baseUrl}/api/caoliao/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Anxun-Webhook-Secret': webhookSecret,
    },
    body: JSON.stringify(payload),
  })
  assert.equal(acceptedResponse.status, 200)
  assert.deepEqual(await acceptedResponse.json(), { success: true, message: 'received' })

  const oversizedResponse = await fetch(`${baseUrl}/api/caoliao/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Anxun-Webhook-Secret': webhookSecret,
    },
    body: JSON.stringify({ oversized: 'x'.repeat(1024 * 1024 + 1) }),
  })
  assert.equal(oversizedResponse.status, 200)
  assert.deepEqual(await oversizedResponse.json(), { success: true, message: 'received' })

  const unauthorizedDataResponse = await fetch(`${baseUrl}/api/caoliao/events`)
  assert.equal(unauthorizedDataResponse.status, 401)

  const authorizedDataResponse = await fetch(`${baseUrl}/api/caoliao/events`, {
    headers: { 'X-Anxun-Internal-Key': internalKey },
  })
  assert.equal(authorizedDataResponse.status, 200)
  const authorizedData = await authorizedDataResponse.json()
  assert.equal(authorizedData.total, 2)

  const realDashboardResponse = await fetch(`${baseUrl}/api/gov/pingxiang/dashboard`, {
    headers: { 'X-Anxun-Internal-Key': internalKey },
  })
  assert.equal(realDashboardResponse.status, 409)

  const dataFile = path.join(tempDirectory, '.data', 'caoliao-business-events.jsonl')
  const businessEvents = (await readFile(dataFile, 'utf8')).trim().split(/\r?\n/)
  assert.equal(businessEvents.length, 2)

  const logText = output.join('')
  assert.doesNotMatch(logText, new RegExp(webhookSecret))
  assert.doesNotMatch(logText, new RegExp(internalKey))
})
