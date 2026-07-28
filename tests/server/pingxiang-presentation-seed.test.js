import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPingxiangPresentationSeed } from '../../server/seeds/pingxiangPresentationData.js'

test('平乡测试数据固定生成30家企业和168条完整业务记录', () => {
  const seed = buildPingxiangPresentationSeed()
  const byKind = seed.records.reduce((result, record) => {
    result[record.kind] = (result[record.kind] || 0) + 1
    return result
  }, {})

  assert.equal(seed.companies.length, 30)
  assert.equal(seed.records.length, 168)
  assert.deepEqual(byKind, {
    hazard: 60,
    inspection: 60,
    work_permit: 24,
    training: 24,
  })
  assert.ok(seed.companies.every(company =>
    company.industry && company.address && company.contactName && company.contactPhone))
  assert.ok(seed.records.every(record => record.attachments.length >= 2))
  const companiesWithRecords = new Set(seed.records.map(record => record.company.companyId))
  assert.equal(companiesWithRecords.size, 30)
})

test('四类测试详情具备业务过程字段且不使用技术人员名称', () => {
  const seed = buildPingxiangPresentationSeed()
  const forbiddenPersonText = /权限|验收|草料|表单|测试账号/

  const hazards = seed.records.filter(record => record.kind === 'hazard')
  const inspections = seed.records.filter(record => record.kind === 'inspection')
  const permits = seed.records.filter(record => record.kind === 'work_permit')
  const trainings = seed.records.filter(record => record.kind === 'training')

  assert.ok(hazards.every(record =>
    record.specialized.reporter
    && record.specialized.assignee
    && record.detail.rectification_content
    && record.detail.timeline.length === 5))
  assert.ok(inspections.every(record =>
    record.specialized.inspector
    && record.detail.items.length === 6
    && record.detail.timeline.length === 3))
  assert.ok(permits.every(record =>
    record.specialized.guardian
    && record.detail.approvals.length >= 2
    && record.detail.measures.length >= 4))
  assert.ok(trainings.every(record =>
    record.detail.participants.length >= 8
    && record.detail.timeline.length === 4))

  const people = seed.records.flatMap(record => [
    record.specialized.reporter,
    record.specialized.assignee,
    record.specialized.inspector,
    record.specialized.applicant,
    record.specialized.guardian,
    record.specialized.participantName,
  ].filter(Boolean))
  assert.ok(people.every(person => !forbiddenPersonText.test(person)))
  assert.ok(seed.records.flatMap(record => record.attachments)
    .every(file => file.name.includes('测试资料') && file.url.startsWith('/test-evidence/pingxiang/')))
})
