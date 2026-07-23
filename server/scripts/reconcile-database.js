import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'

const pool = getMysqlPool()

const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params)
  return rows
}

try {
  const [totals] = await query(
    `SELECT
       COUNT(*) AS raw_events,
       SUM(source_environment = 'test') AS test_events,
       SUM(source_environment = 'real') AS real_events,
       SUM(parse_status = 'processed') AS processed_events,
       SUM(parse_status = 'isolated') AS isolated_events,
       SUM(parse_status = 'failed') AS failed_events,
       MIN(received_at) AS earliest_received_at,
       MAX(received_at) AS latest_received_at
     FROM webhook_events`,
  )
  const businessByType = await query(
    `SELECT record_type, COUNT(*) AS record_count
       FROM business_records
      GROUP BY record_type
      ORDER BY record_type`,
  )
  const businessByCompany = await query(
    `SELECT c.company_id, c.company_name, COUNT(b.record_id) AS record_count
       FROM companies c
       LEFT JOIN business_records b ON b.company_id = c.company_id
      WHERE c.project_id = 'pingxiang'
      GROUP BY c.company_id, c.company_name
      ORDER BY c.company_id`,
  )
  const qualityByType = await query(
    `SELECT issue_type, COUNT(*) AS issue_count
       FROM data_quality_issues
      GROUP BY issue_type
      ORDER BY issue_type`,
  )
  const [attachmentTotals] = await query(
    'SELECT COUNT(*) AS attachment_count FROM record_attachments',
  )
  const batches = await query(
    `SELECT batch_id, source_environment, total_rows, inserted_rows, duplicate_rows,
            failed_rows, unmatched_rows, status, started_at, finished_at
       FROM data_import_batches
      ORDER BY started_at`,
  )

  console.log(JSON.stringify({
    success: true,
    totals,
    businessByType,
    businessByCompany,
    qualityByType,
    attachmentCount: Number(attachmentTotals.attachment_count || 0),
    batches,
  }, null, 2))
} finally {
  await closeMysqlPool()
}
