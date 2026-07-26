import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'
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
const integerValueFor = (name, fallback) => {
  const value = Number(valueFor(name))
  return Number.isInteger(value) && value > 0 ? value : fallback
}
const dryRun = args.includes('--dry-run')
const sourceFile = path.resolve(valueFor('--file') || '.data/caoliao-business-events.jsonl')
const resumeBatchId = valueFor('--resume-batch')
const startLine = integerValueFor('--start-line', 1)
const endLine = integerValueFor('--end-line', Number.MAX_SAFE_INTEGER)
const content = await readFile(sourceFile, 'utf8')
const checksum = createHash('sha256').update(content).digest('hex')
const lines = content.split(/\r?\n/)
const items = []

lines.forEach((line, index) => {
  const lineNumber = index + 1
  if (!line.trim() || lineNumber < startLine || lineNumber > endLine) return
  try {
    items.push({ lineNumber, rawLine: line, payload: JSON.parse(line), parseError: '' })
  } catch (error) {
    items.push({ lineNumber, rawLine: line, payload: {}, parseError: error.message })
  }
})

const drySummary = {
  sourceFile,
  checksum,
  totalRows: lines.filter(line => line.trim()).length,
  selectedRows: items.length,
  validRows: items.filter(item => !item.parseError).length,
  invalidRows: items.filter(item => item.parseError).length,
  startLine,
  endLine: endLine === Number.MAX_SAFE_INTEGER ? null : endLine,
  byType: {},
  byCompany: {},
  duplicateSourceEventsInFile: 0,
}
const sourceIds = new Set()

for (const item of items.filter(entry => !entry.parseError)) {
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

const pool = getMysqlPool()
let batchId = resumeBatchId
const completedLines = new Set()

try {
  if (resumeBatchId) {
    const [batches] = await pool.execute(
      `SELECT batch_id, source_file, source_checksum
         FROM data_import_batches
        WHERE batch_id = ?`,
      [resumeBatchId],
    )
    const batch = batches[0]
    if (!batch) throw new Error(`resume-batch-not-found:${resumeBatchId}`)
    if (batch.source_checksum !== checksum) throw new Error('resume-batch-checksum-mismatch')
    if (path.resolve(batch.source_file) !== sourceFile) throw new Error('resume-batch-source-file-mismatch')
    const [logs] = await pool.execute(
      `SELECT source_line, result_status
         FROM migration_logs
        WHERE batch_id = ?
        ORDER BY created_at, migration_log_id`,
      [resumeBatchId],
    )
    for (const log of logs) {
      if (log.source_line && log.result_status !== 'failed') completedLines.add(Number(log.source_line))
    }
  } else {
    batchId = await createImportBatch({
      sourceFile,
      checksum,
      totalRows: drySummary.totalRows,
    })
  }
} catch (error) {
  await closeMysqlPool()
  throw error
}

const currentRun = {
  attempted: 0,
  skippedCompleted: 0,
}

const importItem = async item => {
  const record = item.parseError
    ? {
        formType: 'unknown',
        recognized: false,
        enterpriseName: '',
        formName: '',
        formNumber: '',
        serialNumber: '',
        identifyReason: 'invalid-json',
        matchedKeywords: [],
      }
    : item.payload.record || await dispatchBusinessProcess(item.payload)
  return ingestMysqlEvent({
    requestId: item.payload.requestId || `migration-${batchId}-${item.lineNumber}`,
    receivedAt: item.payload.receivedAt || new Date().toISOString(),
    headers: { source: 'jsonl-migration' },
    payload: item.payload,
    rawBody: item.rawLine,
    parseError: item.parseError,
    record,
    connectorKey: 'caoliao-pingxiang-test',
  })
}

try {
  for (const item of items) {
    if (completedLines.has(item.lineNumber)) {
      currentRun.skippedCompleted += 1
      continue
    }
    currentRun.attempted += 1
    try {
      const result = await importItem(item)
      await addMigrationLog({
        batchId,
        lineNumber: item.lineNumber,
        sourceEventId: result.sourceEventId,
        status: result.status,
        message: item.parseError || result.reason || '',
      })
    } catch (error) {
      await addMigrationLog({
        batchId,
        lineNumber: item.lineNumber,
        status: 'failed',
        message: error.message,
      })
    }
  }

  const [logs] = await pool.execute(
    `SELECT source_line, result_status
       FROM migration_logs
      WHERE batch_id = ?
      ORDER BY created_at, migration_log_id`,
    [batchId],
  )
  const latestByLine = new Map()
  logs.forEach(log => latestByLine.set(Number(log.source_line), log.result_status))
  const summary = {
    total: drySummary.totalRows,
    inserted: 0,
    duplicates: 0,
    unmatched: 0,
    isolated: 0,
    recovered: 0,
    failed: 0,
    byType: drySummary.byType,
    byCompany: drySummary.byCompany,
    currentRun,
  }
  for (const status of latestByLine.values()) {
    if (status === 'inserted') summary.inserted += 1
    else if (status === 'duplicate') summary.duplicates += 1
    else if (status === 'unmatched') summary.unmatched += 1
    else if (status === 'isolated') summary.isolated += 1
    else if (status === 'recovered') summary.recovered += 1
    else if (status === 'failed') summary.failed += 1
  }
  const status = summary.failed ? 'completed_with_errors' : 'completed'
  await finishImportBatch(batchId, summary, status)
  console.log(JSON.stringify({ mode: resumeBatchId ? 'resume' : 'import', batchId, checksum, ...summary }, null, 2))
  if (summary.failed) process.exitCode = 2
} catch (error) {
  await finishImportBatch(batchId, {
    total: drySummary.totalRows,
    inserted: 0,
    duplicates: 0,
    unmatched: 0,
    failed: 1,
    currentRun,
  }, 'failed')
  throw error
} finally {
  await closeMysqlPool()
}
