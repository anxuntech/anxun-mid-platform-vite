import { expect, test, type Page } from '@playwright/test'

const screenshotDir = 'output/playwright/pingxiang-v2-release'

const emptyPayload = {
  success: true,
  companies: [],
  hazard_reports: [],
  patrol_records: [],
  work_permits: [],
  training_exam_records: [],
  warnings: [],
}

const company = (index: number, longName = false) => ({
  company_id: `qa-company-${index}`,
  company_name: longName
    ? '平乡县宏达童车配件精密制造与仓储物流综合安全管理示范有限公司'
    : `平乡县验收企业${String(index).padStart(2, '0')}有限公司`,
})

const smallPayload = {
  ...emptyPayload,
  companies: [company(1)],
  hazard_reports: [{ id: 'hazard-1', company_id: 'qa-company-1', title: '配电箱周边堆放杂物', status: '待整改', submitted_at: '2026-07-20 09:30', responsible_person: '张明' }],
  patrol_records: [{ id: 'patrol-1', company_id: 'qa-company-1', title: '灭火器压力检查', status: '正常', submitted_at: '2026-07-20 10:10', submitter: '李强' }],
  work_permits: [{ id: 'permit-1', company_id: 'qa-company-1', permit_type: '动火作业', status: '已归档', submitted_at: '2026-07-20 11:20', applicant: '王敏' }],
  training_exam_records: [{ id: 'training-1', company_id: 'qa-company-1', course_name: '消防安全培训', status: '已完成', exam_result: '合格', score: 92, submitted_at: '2026-07-20 14:00', person_name: '赵磊' }],
}

const longPayload = {
  ...emptyPayload,
  companies: Array.from({ length: 12 }, (_, index) => company(index + 1, index === 0)),
}

const mockDashboard = async (page: Page, payload: object) => {
  await page.route('**/api/gov/pingxiang/dashboard', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }))
}

const openWithoutBrowserErrors = async (page: Page, path: string) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(path)
  await expect(page.locator('.pxv2-shell')).toBeVisible()
  await expect(page.locator('.pxv2-env-badge')).toContainText('演示环境')
  expect(errors).toEqual([])
}

test('平乡 V2 全部路由可访问且控制台无错误', async ({ page }) => {
  const routes = [
    '/gov/pingxiang',
    '/gov/pingxiang/companies',
    '/gov/pingxiang/company/px-company-001',
    '/gov/pingxiang/hazards',
    '/gov/pingxiang/patrols',
    '/gov/pingxiang/work-permits',
    '/gov/pingxiang/training',
    '/gov/pingxiang/reports',
    '/gov/pingxiang/about',
  ]

  for (const route of routes) {
    await openWithoutBrowserErrors(page, route)
  }
})

test('生成 1440×900、1920×1080 和项目说明验收截图', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/gov/pingxiang')
  await expect(page.locator('.pxv2-env-badge')).toContainText('演示环境')
  await page.screenshot({ path: `${screenshotDir}/overview-1440x900.png` })

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.reload()
  await page.screenshot({ path: `${screenshotDir}/overview-1920x1080.png` })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/gov/pingxiang/about')
  await expect(page.getByRole('heading', { name: '项目介绍' })).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/project-about-1440x900.png` })
})

test('空数据状态不使用演示数字补齐', async ({ page }) => {
  await mockDashboard(page, emptyPayload)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/gov/pingxiang?data=real')
  await expect(page.locator('.pxv2-env-badge')).toContainText('真实数据')
  await expect(page.getByText('暂无数据').first()).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/state-empty-1440x900.png` })
})

test('少数据状态可以完整呈现企业与四项记录', async ({ page }) => {
  await mockDashboard(page, smallPayload)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/gov/pingxiang/companies?data=real')
  await expect(page.getByText('平乡县验收企业01有限公司')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.screenshot({ path: `${screenshotDir}/state-small-1440x900.png` })
})

test('长文本与12家企业分页状态正常', async ({ page }) => {
  await mockDashboard(page, longPayload)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/gov/pingxiang/companies?data=real')
  await expect(page.getByText('平乡县宏达童车配件精密制造与仓储物流综合安全管理示范有限公司')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(10)
  await page.screenshot({ path: `${screenshotDir}/state-long-text-1440x900.png` })
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page).toHaveURL(/companyPage=2/)
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByText('第 2 / 2 页')).toBeVisible()
})
