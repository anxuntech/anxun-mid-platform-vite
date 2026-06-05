import { mkdir, appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'

const dataDir = path.resolve(process.cwd(), '.data')
const eventsFile = path.join(dataDir, 'caoliao-business-events.jsonl')

const ensureDataDir = async () => {
  await mkdir(dataDir, { recursive: true })
}

const safeJsonParse = line => {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

const isTestBusinessEvent = event => {
  const serialNumber = String(event?.record?.serialNumber || event?.identifyTrace?.serialNumber || '').toUpperCase()
  const requestId = String(event?.requestId || '').toUpperCase()
  return serialNumber.includes('TEST') || serialNumber.includes('ONLINE-TEST') || requestId.includes('TEST')
}

export const appendBusinessEvent = async event => {
  await ensureDataDir()
  await appendFile(eventsFile, `${JSON.stringify(event)}\n`, 'utf8')
}

export const readBusinessEvents = async ({ branch, limit = 50 } = {}) => {
  try {
    const content = await readFile(eventsFile, 'utf8')
    const events = content
      .split(/\r?\n/)
      .filter(Boolean)
      .map(safeJsonParse)
      .filter(Boolean)
      .filter(event => !branch || event.branch === branch)
      .filter(event => !isTestBusinessEvent(event))
      .reverse()

    return events.slice(0, Math.max(1, Math.min(Number(limit) || 50, 200)))
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

export const getBusinessEventsFile = () => eventsFile
