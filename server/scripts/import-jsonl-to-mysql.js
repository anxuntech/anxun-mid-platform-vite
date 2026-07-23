import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { closeMysqlPool } from '../db/mysql.js'
import {
  addMigrationLog,
  createImportBatch,
  finishImportBatch,
} from '../repositories/mysqlBusinessRepository.js'
import { dispatchBusinessProcess } from '../services/caoliaoBusinessService.js'
import { deriveSourceEventId, hashPayload } from '../services/eventIdentity.js'
import { ingestMysqlEvent } from '../services/mysqlEventIngestService.js'

const args = process.argv.slice(2)
const valueFor = name => {
  const direct = args.find(value => value.startsWith(`${name}=`))
  return direct ? direct.slice(name.length + 1) : ''
}
const dryRun = args.includes('--dry-run')
const sourceFile = path.resolve(valueFor('--file') || '.data/caoliao-business-events.jsonl')
const content = await readFile(sourceFile, 'utf8')
const checksum = createHash('sha256').update(content).digest('hex')
const lines = content.split(/\r?\n/)
const parsed = []
const invalid = []

lines.forEach((line, index) => {
  if (!line.trim()) return
  try {
    parsed.push({ lineNumber: index + 1, payload: JSON.parse(line) })
  } catch (error) {
    invalid.push({ lineNumber: index + 1, message: error.message })
  }
})

const drySummary = {
  sourceFile,
  checksum,
  totalRows: parsed.length + invalid.length,
  validRows: parsed.length,
  invalidRows: invalid.length,
  byType: {},
  byCompany: {},
  duplicateSourceEventsInFile: 0,
}
const sourceIds = new Set()

for (const item of parsed) {
  const record = item.payload.record || await dispatchBusinessProcess(item.payload)
  const type = record.formType || 'unknown'
  const company = record.enterpriseName || '未识别企业'
  drySummary.byType[type] = (drySummary.byType[type] || 0) + 1
  drySummary.byCompany[company] = (drySummary.byCompany[company] || 0) + 1
  const payloadHash = hashPayload(item.payload)
  const sourceEventId = deriveSourceEventId({ payload: item.payload, record, payloadHash })
  if (sourceIds.has(sourceEventId)) drySummary.duplicateSourceEventsInFile += 1
  sourceIds.add(sourceEventId)
}

if (dryRun) {
  console.log(JSON.stringify({ mode: 'dry-run', ...drySummary }, null, 2))
  process.exit(0)
}

const batchId = await createImportBatch({
  sourceFile,
  checksum,
  totalRows: drySummary.totalRows,
})
const summary = {
  total: drySummary.totalRows,
  inserted: 0,
  duplicates: 0,
  unmatched: 0,
  isolated: 0,
  failed: invalid.length,
  byType: drySummary.byType,
  byCompany: drySummary.byCompany,
}

try {
  for (const item of invalid) {
    await addMigrationLog({
      batchId,
      lineNumber: item.lineNumber,
      status: 'failed',
      message: item.message,
    })
  }

  for (const item of parsed) {
    try {
      const record = item.payload.record || await dispatchBusinessProcess(item.payload)
      const result = await ingestMysqlEvent({
        requestId: item.payload.requestId || `migration-${batchId}-${item.lineNumber}`,
        receivedAt: item.payload.receivedAt || new Date().toISOString(),
        headers: { source: 'jsonl-migration' },
        payload: item.payload,
        record,
        connectorKey: 'caoliao-pingxiang-test',
      })
      if (result.status === 'duplicate') summary.duplicates += 1
      else if (result.status === 'inserted') summary.inserted += 1
      else if (result.status === 'unmatched') summary.unmatched += 1
      else summary.isolated += 1
      await addMigrationLog({
        batchId,
        lineNumber: item.lineNumber,
        sourceEventId: result.sourceEventId,
        status: result.status,
        message: result.reason || '',
      })
    } catch (error) {
      summary.failed += 1
      await addMigrationLog({
        batchId,
        lineNumber: item.lineNumber,
        status: 'failed',
        message: error.message,
      })
    }
  }
  const status = summary.failed ? 'completed_with_errors' : 'completed'
  await finishImportBatch(batchId, summary, status)
  console.log(JSON.stringify({ mode: 'import', batchId, checksum, ...summary }, null, 2))
  if (summary.failed) process.exitCode = 2
} catch (error) {
  await finishImportBatch(batchId, summary, 'failed')
  throw error
} finally {
  await closeMysqlPool()
}
