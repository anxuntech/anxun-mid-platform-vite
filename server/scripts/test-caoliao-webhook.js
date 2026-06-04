const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://127.0.0.1:8787'

const payload = {
  ref_data: {
    form: {
      name: '君和同创灭火器检查',
      number: 'D21',
    },
    serial_number: 'D21-LOCAL-TEST-001',
    fields: [
      { name: '企业名称', value: '邢台新源注塑包装有限公司' },
      { name: '设备类型', value: '灭火器' },
      { name: '检查结果', value: '压力正常，铅封完整，外观无破损，有效期内' },
      { name: '是否正常', value: '正常' },
      { name: '检查人', value: '草料点检员' },
    ],
  },
  submittedAt: '2026-06-05 10:00:00',
}

const webhookResponse = await fetch(`${baseUrl}/api/caoliao/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

console.log('[test:webhook] status:', webhookResponse.status)
console.log('[test:webhook] body:', await webhookResponse.text())

const recordsResponse = await fetch(`${baseUrl}/api/caoliao/service-records?limit=3`)
console.log('[test:records] status:', recordsResponse.status)
console.log('[test:records] body:', await recordsResponse.text())
