import { randomUUID } from 'node:crypto'
import { getMysqlPool } from '../db/mysql.js'

export const countAiQueriesToday = async userId => {
  const [rows] = await getMysqlPool().execute(
    `SELECT COUNT(*) AS query_count
       FROM ai_query_audit_logs
      WHERE user_id = ?
        AND result_status IN ('success', 'empty', 'model-fallback')
        AND created_at >= CURRENT_DATE()
        AND created_at < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)`,
    [userId],
  )
  return Number(rows[0]?.query_count || 0)
}

export const writeAiQueryAudit = async ({
  userId = null,
  username = '',
  organizationName = '',
  projectId,
  questionRedacted = '',
  questionHash,
  intent = '',
  queryScope = {},
  resultCount = 0,
  durationMs = 0,
  modelName = '',
  inputTokens = 0,
  outputTokens = 0,
  resultStatus,
  errorCode = '',
  requestId = '',
  ipAddress = '',
}) => {
  await getMysqlPool().execute(
    `INSERT INTO ai_query_audit_logs (
       audit_id, user_id, username, organization_name, project_id,
       question_redacted, question_hash, intent, query_scope_json,
       result_count, duration_ms, model_name, input_tokens, output_tokens,
       result_status, error_code, request_id, ip_address
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      userId,
      username,
      organizationName,
      projectId,
      questionRedacted,
      questionHash,
      intent,
      JSON.stringify(queryScope || {}),
      Number(resultCount || 0),
      Number(durationMs || 0),
      modelName,
      Number(inputTokens || 0),
      Number(outputTokens || 0),
      resultStatus,
      errorCode,
      requestId,
      ipAddress,
    ],
  )
}
