import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const logDir = path.resolve(process.cwd(), '.logs')
const webhookLogFile = path.join(logDir, 'caoliao-webhook.jsonl')
const maxLogBytes = () => Number(process.env.WEBHOOK_LOG_MAX_BYTES || 20 * 1024 * 1024)
const retainedFiles = () => Math.max(1, Number(process.env.WEBHOOK_LOG_RETAINED_FILES || 5))
let writeQueue = Promise.resolve()

const ensureLogDir = async () => {
  await mkdir(logDir, { recursive: true })
}

const rotateIfNeeded = async nextEntryBytes => {
  let currentSize = 0
  try {
    currentSize = (await stat(webhookLogFile)).size
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  if (currentSize + nextEntryBytes <= maxLogBytes()) return

  const retained = retainedFiles()
  await rm(`${webhookLogFile}.${retained}`, { force: true })
  for (let index = retained - 1; index >= 1; index -= 1) {
    try {
      await rename(`${webhookLogFile}.${index}`, `${webhookLogFile}.${index + 1}`)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  try {
    await rename(webhookLogFile, `${webhookLogFile}.1`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

export const writeWebhookLog = async entry => {
  const line = `${JSON.stringify(entry)}\n`
  await ensureLogDir()
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    await rotateIfNeeded(Buffer.byteLength(line, 'utf8'))
    await appendFile(webhookLogFile, line, 'utf8')
  })
  return writeQueue
}

export const getWebhookLogFile = () => webhookLogFile
