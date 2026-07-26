import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {
  dispatchBusinessProcess,
  identifyFormBranch,
} from '../../server/services/caoliaoBusinessService.js'
import { deriveSourceEventId, hashPayload, normalizeCompanyKey } from '../../server/services/eventIdentity.js'
import { verifyInternalDataRequest, verifyWebhookRequest } from '../../server/security/requestAuth.js'
import { toMysqlDateTime } from '../../server/utils/businessTime.js'

const projectRoot = path.resolve(import.meta.dirname, '..', '..')

const withEnv = async (values, callback) => {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]))
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  })
  try {
    await callback()
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
  }
}

test('事件指纹不受对象字段顺序影响', () => {
  assert.equal(hashPayload({ b: 2, a: 1 }), hashPayload({ a: 1, b: 2 }))
  assert.equal(
    deriveSourceEventId({
      payload: { ref_data: { serial_number: 'PX-001' } },
      record: { formNumber: 'D159' },
      payloadHash: 'fallback',
    }),
    'D159:PX-001',
  )
  assert.equal(normalizeCompanyKey(' 平乡县 宏达童车配件有限公司 '), '平乡县宏达童车配件有限公司')
})

test('业务时间固定按北京时间转换，不受运行机器或VPN时区影响', async () => {
  await withEnv({ BUSINESS_TIME_ZONE: 'Asia/Shanghai' }, () => {
    assert.equal(toMysqlDateTime('2026-07-23T00:00:00.123Z'), '2026-07-23 08:00:00.123')
    assert.equal(toMysqlDateTime('2026-07-23T09:00:00.000+09:00'), '2026-07-23 08:00:00.000')
    assert.equal(toMysqlDateTime('2026-07-23 10:30:00'), '2026-07-23 10:30:00.000')
  })
})

test('现有草料真实表单识别能力保持兼容', () => {
  assert.equal(identifyFormBranch({ ref_data: { form: { number: 'D159', name: '隐患上报' } } }).branch, 'hazard')
  for (const formNumber of ['D105', 'D107', 'D108', 'D110', 'D111', 'D112']) {
    assert.equal(
      identifyFormBranch({ ref_data: { form: { number: formNumber, name: '设备检查' } } }).branch,
      'serviceRecord',
    )
  }
  assert.equal(identifyFormBranch({ formType: 'workPermit' }).branch, 'workPermit')
  assert.equal(identifyFormBranch({ formType: 'trainingExam' }).branch, 'trainingExam')
})

test('四类业务记录均形成可入库的结构化字段', async () => {
  const common = {
    enterpriseName: '平乡县宏达童车配件有限公司',
    serialNumber: `four-types-${Date.now()}`,
    submittedAt: '2026-07-23T00:00:00.000Z',
  }
  const records = await Promise.all([
    dispatchBusinessProcess({
      ...common,
      formType: 'hazard',
      hazardName: '机械防护缺失',
      status: '待整改',
    }),
    dispatchBusinessProcess({
      ...common,
      formType: 'serviceRecord',
      serviceType: '机械设备巡检',
      resultSummary: '设备运行正常',
    }),
    dispatchBusinessProcess({
      ...common,
      formType: 'workPermit',
      permitType: '动火作业票',
      plannedStart: '2026-07-23T01:00:00.000Z',
      guardian: '张三',
    }),
    dispatchBusinessProcess({
      ...common,
      formType: 'trainingExam',
      courseName: '消防安全培训',
      score: 95,
    }),
  ])
  assert.deepEqual(records.map(record => record.formType), [
    'hazard',
    'serviceRecord',
    'workPermit',
    'trainingExam',
  ])
  assert.ok(records.every(record => record.recognized))
  assert.equal(records[1].serviceType, '机械设备巡检')
  assert.equal(records[2].guardian, '张三')
  assert.equal(records[3].score, 95)
})

test('Webhook认证默认兼容，强制模式拒绝错误密钥', async () => {
  await withEnv({ WEBHOOK_AUTH_REQUIRED: 'false', CAOLIAO_WEBHOOK_SECRET: undefined }, () => {
    assert.equal(verifyWebhookRequest({ url: '/api/caoliao/webhook', headers: {} }).accepted, true)
  })
  await withEnv({
    WEBHOOK_AUTH_REQUIRED: 'true',
    WEBHOOK_ALLOW_QUERY_TOKEN: 'false',
    CAOLIAO_WEBHOOK_SECRET: 'test-secret-value',
  }, () => {
    assert.equal(
      verifyWebhookRequest({
        url: '/api/caoliao/webhook',
        headers: { 'x-anxun-webhook-secret': 'wrong' },
      }).accepted,
      false,
    )
    assert.equal(
      verifyWebhookRequest({
        url: '/api/caoliao/webhook',
        headers: { 'x-anxun-webhook-secret': 'test-secret-value' },
      }).accepted,
      true,
    )
    assert.equal(
      verifyWebhookRequest({
        url: '/api/caoliao/webhook?token=test-secret-value',
        headers: {},
      }).accepted,
      false,
    )
  })
  await withEnv({
    WEBHOOK_AUTH_REQUIRED: 'true',
    WEBHOOK_ALLOW_QUERY_TOKEN: 'true',
    CAOLIAO_WEBHOOK_SECRET: 'test-secret-value',
  }, () => {
    assert.equal(
      verifyWebhookRequest({
        url: '/api/caoliao/webhook?token=test-secret-value',
        headers: {},
      }).accepted,
      true,
    )
  })
})

test('真实数据接口只允许本机或正确内部密钥', async () => {
  await withEnv({ INTERNAL_DATA_API_KEY: 'internal-test-key', INTERNAL_DATA_ALLOW_LOOPBACK: 'false' }, () => {
    assert.equal(
      verifyInternalDataRequest({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }).accepted,
      false,
    )
    assert.equal(
      verifyInternalDataRequest({ headers: {}, socket: { remoteAddress: '203.0.113.10' } }).accepted,
      false,
    )
    assert.equal(
      verifyInternalDataRequest({
        headers: { 'x-anxun-internal-key': 'internal-test-key' },
        socket: { remoteAddress: '203.0.113.10' },
      }).accepted,
      true,
    )
  })
  await withEnv({ INTERNAL_DATA_API_KEY: undefined, INTERNAL_DATA_ALLOW_LOOPBACK: 'true' }, () => {
    assert.equal(
      verifyInternalDataRequest({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }).accepted,
      true,
    )
    assert.equal(
      verifyInternalDataRequest({
        headers: { 'x-forwarded-for': '198.51.100.2' },
        socket: { remoteAddress: '127.0.0.1' },
      }).accepted,
      false,
    )
  })
})

test('初始迁移包含P1要求的核心实体和环境隔离字段', async () => {
  const sql = await readFile('database/migrations/001_initial_schema.up.sql', 'utf8')
  const tables = [
    'counties',
    'projects',
    'companies',
    'source_connectors',
    'source_company_mappings',
    'webhook_events',
    'business_records',
    'hazard_records',
    'inspection_records',
    'work_permit_records',
    'training_records',
    'record_attachments',
    'data_import_batches',
    'migration_logs',
    'data_quality_issues',
    'event_replay_jobs',
  ]
  tables.forEach(table => assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`)))
  assert.match(sql, /source_environment/)
  assert.match(sql, /UNIQUE KEY uk_webhook_source_event/)
  assert.match(sql, /UNIQUE KEY uk_business_source_record/)
})

test('P1数据契约迁移保留无效JSON原文并补齐企业详情字段', async () => {
  const sql = await readFile('database/migrations/004_p1_data_contract.up.sql', 'utf8')
  assert.match(sql, /raw_body LONGTEXT/)
  assert.match(sql, /parse_error/)
  assert.match(sql, /contact_name/)
  assert.match(sql, /contact_phone/)
  assert.match(sql, /source_connectors[\s\S]*project_id/)
})

test('Webhook在业务解析前先保存MySQL原始事件', async () => {
  const source = await readFile(
    path.resolve(projectRoot, 'server', 'services', 'caoliaoWebhookService.js'),
    'utf8',
  )
  const rawWritePosition = source.indexOf('await saveMysqlRawEvent')
  const dispatchPosition = source.indexOf('await dispatchBusinessProcess')
  assert.ok(rawWritePosition >= 0)
  assert.ok(dispatchPosition >= 0)
  assert.ok(rawWritePosition < dispatchPosition)
})

test('数据库结构回退只允许空库显式执行', async () => {
  const rollbackScript = await readFile(
    path.resolve(projectRoot, 'server', 'scripts', 'rollback-database.js'),
    'utf8',
  )
  assert.match(rollbackScript, /ALLOW_EMPTY_DATABASE_ROLLBACK/)
  assert.match(rollbackScript, /rollback-refused-non-empty-table/)
  assert.match(rollbackScript, /DDL may have partially committed/)
  assert.doesNotMatch(rollbackScript, /beginTransaction/)
})

test('JSONL迁移支持断点续传并保存无效原文', async () => {
  const source = await readFile(
    path.resolve(projectRoot, 'server', 'scripts', 'import-jsonl-to-mysql.js'),
    'utf8',
  )
  assert.match(source, /--resume-batch/)
  assert.match(source, /--start-line/)
  assert.match(source, /rawBody: item\.rawLine/)
  assert.match(source, /parseError: item\.parseError/)
})

test('Webhook路由允许草料使用查询参数携带认证令牌', async () => {
  const { isCaoliaoWebhookRoute } = await import('../../server/routes/caoliaoRoutes.js')
  assert.equal(isCaoliaoWebhookRoute({ url: '/api/caoliao/webhook?token=secret' }), true)
})
