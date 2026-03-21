import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'

const logDir = path.resolve(process.cwd(), '.logs')
const webhookLogFile = path.join(logDir, 'caoliao-webhook.jsonl')

const ensureLogDir = async () => {
  await mkdir(logDir, { recursive: true })
}

export const writeWebhookLog = async entry => {
  await ensureLogDir()
  await appendFile(webhookLogFile, `${JSON.stringify(entry)}\n`, 'utf8')
}

export const getWebhookLogFile = () => webhookLogFile
