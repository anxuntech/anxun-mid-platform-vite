const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://127.0.0.1:8787'

const payload = {
  formType: 'hazard',
  form_name: 'hazard-report-form',
  title: 'test hazard: blocked electric box front area',
  submitter: 'local-test-user',
  submittedAt: '2026-03-21 19:20:00',
  data: {
    enterpriseName: 'Xintai Plastic Packaging Co., Ltd.',
    description: 'Front area of electric box is blocked and needs cleanup.',
  },
}

const response = await fetch(`${baseUrl}/api/caoliao/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

console.log('[test] status:', response.status)
console.log('[test] body:', await response.text())
