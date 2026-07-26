import { expect, test, type Page } from '@playwright/test'

const screenshotDir = 'output/playwright/pingxiang-v2.1-release'
const demoPath = (path: string) => path.replace(/^\/gov\/pingxiang/, '/gov/pingxiang-demo')

const coreRoutes = [
  '/gov/pingxiang',
  '/gov/pingxiang/companies',
  '/gov/pingxiang/companies/px-company-001',
  '/gov/pingxiang/hazards',
  '/gov/pingxiang/hazards/PX-YH-0001',
  '/gov/pingxiang/inspections',
  '/gov/pingxiang/inspections/PX-XJ-0001',
  '/gov/pingxiang/work-permits',
  '/gov/pingxiang/work-permits/PX-ZY-0001',
  '/gov/pingxiang/trainings',
  '/gov/pingxiang/trainings/PX-PX-0001',
  '/gov/pingxiang/reports',
  '/gov/pingxiang/reports/monthly',
  '/gov/pingxiang/about',
]

const emptyPayload = {
  success: true,
  companies: [],
  hazard_reports: [],
  patrol_records: [],
  work_permits: [],
  training_exam_records: [],
  warnings: [],
}

const smallPayload = {
  ...emptyPayload,
  companies: [{ company_id: 'qa-company-1', company_name: '平乡县少数据验收企业有限公司' }],
  hazard_reports: [{ id: 'qa-hazard-1', company_id: 'qa-company-1', title: '配电箱周边堆放杂物', status: '待整改', submitted_at: '2026-07-20 09:30', responsible_person: '张明' }],
  patrol_records: [{ id: 'qa-patrol-1', company_id: 'qa-company-1', title: '灭火器压力检查', status: '正常', submitted_at: '2026-07-20 10:10', submitter: '李强' }],
}

const longPayload = {
  ...emptyPayload,
  companies: Array.from({ length: 12 }, (_, index) => ({
    company_id: `qa-company-${index + 1}`,
    company_name: index === 0 ? '平乡县宏达童车配件精密制造与仓储物流综合安全管理示范有限公司' : `平乡县长文本验收企业${index + 1}有限公司`,
  })),
}

const mockDashboard = async (page: Page, payload: object, status = 200) => {
  await page.route('**/api/gov/pingxiang/dashboard*', route => {
    const sourceEnvironment = new URL(route.request().url()).searchParams.get('sourceEnvironment') === 'test'
      ? 'test'
      : 'real'
    return route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ ...payload, source_environment: sourceEnvironment }),
    })
  })
}

const mockFormalSession = async (page: Page) => {
  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      session: {
        userId: 'qa-viewer',
        username: 'qa-viewer',
        displayName: '平乡项目验收账号',
        organizationName: '平乡县应急管理局',
        organizationType: 'government',
        role: 'project_viewer',
        projects: [{
          projectId: 'pingxiang',
          projectSlug: 'pingxiang',
          projectName: '平乡县企业现场安全管理项目',
          countyId: 'pingxiang',
          countySlug: 'pingxiang',
          countyName: '平乡县',
          canDownloadSummary: true,
          canDownloadDetail: false,
        }],
      },
    }),
  }))
}

const mockAdminSession = async (page: Page) => {
  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      session: {
        userId: 'qa-admin',
        username: 'qa-admin',
        displayName: '安巡验收管理员',
        organizationName: '安巡数智科技有限公司',
        organizationType: 'anxun',
        role: 'admin',
        projects: [{
          projectId: 'pingxiang',
          projectSlug: 'pingxiang',
          projectName: '平乡县企业现场安全管理项目',
          countyId: 'pingxiang',
          countySlug: 'pingxiang',
          countyName: '平乡县',
          canDownloadSummary: true,
          canDownloadDetail: true,
        }],
      },
    }),
  }))
}

const browserErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

const openV21 = async (page: Page, path: string) => {
  await page.goto(demoPath(path))
  await expect(page.locator('.pxv2-shell')).toBeVisible()
  await expect(page.locator('.pxv2-env-badge')).toContainText('演示环境')
}

test('全部核心路由可直达且控制台无错误', async ({ page }) => {
  const errors = browserErrors(page)
  for (const route of coreRoutes) await openV21(page, route)
  expect(errors).toEqual([])
})

test('正式平乡入口未登录时跳转到登录页', async ({ page }) => {
  await page.goto('/gov/pingxiang')
  await expect(page).toHaveURL(/\/platform\/login\?returnTo=/)
  await expect(page.getByText('安全服务平台登录')).toBeVisible()
  await expect(page.locator('form.login-form')).toBeVisible()
})

test('第二县域演示入口复用同一组件且数据与平乡隔离', async ({ page }) => {
  await page.goto('/gov/ningjin-demo')
  await expect(page.locator('.pxv2-shell')).toBeVisible()
  await expect(page.locator('.pxv2-brand')).toContainText('宁晋县企业现场安全管理运行平台')
  await expect(page.locator('.pxv2-env-badge')).toContainText('演示环境')
  await page.getByRole('link', { name: /企业清单/ }).click()
  await expect(page).toHaveURL(/\/gov\/ningjin-demo\/companies/)
  await expect(page.getByText(/^宁晋县试点演示企业\d{2}有限公司$/).first()).toBeVisible()
  await expect(page.getByText('平乡县兴安机械制造有限公司')).toHaveCount(0)
})

test('数据助手仅向管理员展示并保持受控测试数据标识', async ({ page }) => {
  await mockAdminSession(page)
  await mockDashboard(page, smallPayload)
  await page.route('**/api/gov/pingxiang/assistant/query', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      answer: '近30天共查询到 1 条未闭环隐患记录。',
      intent: 'query_unclosed_hazards',
      params: { periodDays: 30 },
      total: 1,
      items: [{
        id: 'qa-hazard-1',
        companyId: 'qa-company-1',
        companyName: '平乡县少数据验收企业有限公司',
        title: '配电箱周边堆放杂物',
        status: '待整改',
        occurredAt: '2026-07-20 09:30',
        recordType: 'hazard',
      }],
      scope: {
        companyName: '全部企业',
        status: '全部状态',
        startDate: '2026-06-27',
        endDate: '2026-07-26',
        sourceEnvironment: 'test',
      },
      remainingToday: 19,
      modelFallback: false,
      notice: '查询结果仅用于辅助研判。',
    }),
  }))
  await page.goto('/gov/pingxiang')
  await expect(page.getByRole('group', { name: '管理员数据环境切换' })).toBeVisible()
  await expect(page.getByRole('button', { name: '真实数据' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '测试数据' }).click()
  await expect(page).toHaveURL(/source=test/)
  await expect(page.locator('.pxv2-env-badge')).toContainText('测试数据预览')
  await expect(page.getByRole('button', { name: '测试数据' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '数据助手' })).toBeVisible()
  await page.getByRole('button', { name: '数据助手' }).click()
  await expect(page.getByText('受控测试数据').first()).toBeVisible()
  await page.getByRole('button', { name: '未闭环隐患' }).click()
  await expect(page.getByText('近30天共查询到 1 条未闭环隐患记录。')).toBeVisible()
  await expect(page.getByText('受控测试数据').last()).toBeVisible()
})

test('登录返回地址拒绝协议相对地址和反斜杠绕过', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      session: {
        userId: 'qa-admin',
        username: 'qa-admin',
        displayName: '安巡验收管理员',
        organizationName: '安巡数智科技有限公司',
        organizationType: 'anxun',
        role: 'admin',
        projects: [],
      },
    }),
  }))
  await page.goto('/platform/login?returnTo=%2F%2Fevil.invalid')
  await page.getByPlaceholder('请输入账号').fill('qa-admin')
  await page.getByPlaceholder('请输入密码').fill('P2-test-only')
  await page.getByRole('button', { name: '登录进入平台' }).click()
  await expect(page).toHaveURL(/\/platform\/dashboard$/)
})

test('首页8张指标全部可下钻并携带来源筛选', async ({ page }) => {
  await openV21(page, '/gov/pingxiang')
  const metrics = page.locator('.pxv2-metric-band .pxv2-metric')
  await expect(metrics).toHaveCount(8)
  const expected = ['/companies', '/companies', '/companies', '/hazards', '/hazards', '/inspections', '/work-permits', '/trainings']
  for (let index = 0; index < expected.length; index += 1) {
    await metrics.nth(index).click()
    await expect(page).toHaveURL(new RegExp(`/gov/pingxiang-demo${expected[index].replace('/', '\\/')}`))
    await expect(page.locator('.pxv21-source-filters')).toContainText('首页指标')
    await page.goBack()
    await expect(page.locator('.pxv2-metric-band')).toBeVisible()
  }
})

test('首页趋势Tooltip展示同月全部系列并可点击下钻', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openV21(page, '/gov/pingxiang')
  const firstChart = page.locator('.pxv21-chart-interactive').first()
  await firstChart.locator('svg rect[role="button"]').nth(4).hover()
  const tooltip = firstChart.locator('.pxv21-chart-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('当月新增隐患')
  await expect(tooltip).toContainText('当月完成整改')
  await expect(tooltip).toContainText('闭环率')
  await expect(tooltip).toContainText('涉及企业')
  await page.screenshot({ path: `${screenshotDir}/overview-tooltip-1440x900.png` })
  await firstChart.locator('svg rect[role="button"]').nth(4).click()
  await expect(page).toHaveURL(/\/gov\/pingxiang-demo\/hazards\?.*month=2026-06/)
  await expect(page.locator('.pxv21-source-filters')).toContainText('2026-06')
})

test('30家企业真实分页、排序、宽抽屉、完整详情与返回状态闭环', async ({ page }) => {
  await openV21(page, '/gov/pingxiang/companies?industry=机械制造&companyPage=1')
  await expect(page.locator('tbody tr')).toHaveCount(6)
  await page.getByRole('button', { name: '重置' }).click()
  await expect(page.locator('tbody tr')).toHaveCount(10)
  await expect(page.getByText('共 30 条 · 每页 10 条')).toBeVisible()
  await page.getByRole('button', { name: /下一页/ }).click()
  await expect(page).toHaveURL(/companyPage=2/)
  await expect(page.getByText('第 2 / 3 页')).toBeVisible()
  await page.locator('tbody tr').first().getByRole('link', { name: '快速查看' }).click()
  const drawer = page.locator('.pxv21-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer).toContainText('四项业务摘要')
  const box = await drawer.boundingBox()
  expect(box?.width || 0).toBeGreaterThan(800)
  await page.screenshot({ path: `${screenshotDir}/company-drawer-1440x900.png` })
  await drawer.getByRole('link', { name: /查看完整记录/ }).click()
  await expect(page).toHaveURL(/\/gov\/pingxiang-demo\/companies\/px-company-/)
  await expect(page.getByText('近6个月四项业务趋势')).toBeVisible()
  await page.goBack()
  await expect(drawer).toBeVisible()
  await page.getByRole('button', { name: '关闭详情' }).click()
  await expect(page).toHaveURL(/companyPage=2/)
  await expect(page.getByText('第 2 / 3 页')).toBeVisible()
})

for (const item of [
  { name: '隐患', path: '/gov/pingxiang/hazards', detail: '/gov/pingxiang/hazards/PX-YH-0001', drawerText: '闭环流程时间轴' },
  { name: '巡检', path: '/gov/pingxiang/inspections', detail: '/gov/pingxiang/inspections/PX-XJ-0001', drawerText: '逐项检查结果' },
  { name: '作业票', path: '/gov/pingxiang/work-permits', detail: '/gov/pingxiang/work-permits/PX-ZY-0001', drawerText: '安全措施' },
  { name: '培训', path: '/gov/pingxiang/trainings', detail: '/gov/pingxiang/trainings/PX-PX-0001', drawerText: '参与及考试明细' },
]) {
  test(`${item.name}清单—宽抽屉—完整详情闭环`, async ({ page }) => {
    await openV21(page, item.path)
    await page.locator('tbody tr').first().getByRole('link', { name: '快速查看' }).click()
    await expect(page.locator('.pxv21-drawer')).toContainText(item.drawerText)
    await expect(page.locator('.pxv21-drawer')).toContainText('查看完整记录')
    await page.locator('.pxv21-drawer').getByRole('link', { name: /查看完整记录/ }).click()
    await expect(page).toHaveURL(new RegExp(demoPath(item.detail).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    await expect(page.locator('.pxv21-detail-page')).toBeVisible()
    await expect(page.getByText('打印 / 导出')).toBeVisible()
  })
}

test('报告完整预览并下载可阅读HTML演示文件', async ({ page }) => {
  await openV21(page, '/gov/pingxiang/reports/monthly')
  await expect(page.getByText('月度运行报告')).toBeVisible()
  await expect(page.getByText('演示数据，仅用于功能展示')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /下载演示报告/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/月度运行报告.*\.html$/)
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
})

test('正式报告页提供三个独立受控下载入口', async ({ page }) => {
  await mockFormalSession(page)
  await mockDashboard(page, smallPayload)
  for (const endpoint of ['report-pdf', 'summary', 'business-summary']) {
    await page.route(`**/api/gov/pingxiang/exports/${endpoint}`, route => route.fulfill({
      status: 200,
      contentType: endpoint === 'report-pdf' ? 'application/pdf' : 'application/vnd.ms-excel',
      body: endpoint === 'report-pdf' ? '%PDF-1.4\n%%EOF' : '<?xml version="1.0"?><Workbook />',
    }))
  }
  await page.goto('/gov/pingxiang/reports/monthly')
  for (const buttonName of ['下载阶段报告', '企业运行汇总', '四项业务汇总']) {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: buttonName }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.(pdf|xls)$/)
  }
})

test('空数据、少数据、长文本、加载失败和图片缺失状态稳定', async ({ page }) => {
  await mockFormalSession(page)
  await mockDashboard(page, emptyPayload)
  await page.goto('/gov/pingxiang')
  await expect(page.locator('.pxv2-env-badge')).toContainText('真实数据')
  await expect(page.getByText('暂无数据').first()).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/state-empty-1440x900.png` })

  await page.unrouteAll({ behavior: 'wait' })
  await mockFormalSession(page)
  await mockDashboard(page, smallPayload)
  await page.goto('/gov/pingxiang/companies')
  await expect(page.getByText('平乡县少数据验收企业有限公司')).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/state-small-1440x900.png` })

  await page.unrouteAll({ behavior: 'wait' })
  await mockFormalSession(page)
  await mockDashboard(page, longPayload)
  await page.goto('/gov/pingxiang/companies')
  await expect(page.getByTitle('平乡县宏达童车配件精密制造与仓储物流综合安全管理示范有限公司')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(10)
  await page.screenshot({ path: `${screenshotDir}/state-long-text-1440x900.png` })

  await page.unrouteAll({ behavior: 'wait' })
  await mockFormalSession(page)
  await mockDashboard(page, { success: false, message: '归集失败' }, 500)
  await page.goto('/gov/pingxiang')
  await expect(page.locator('.pxv2-env-badge.error', { hasText: '归集异常' })).toBeVisible()
  await expect(page.getByText('暂无数据').first()).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/state-load-failed-1440x900.png` })

  await page.goto(demoPath('/gov/pingxiang/hazards/PX-YH-0001'))
  await expect(page.getByText('未归集照片').first()).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/state-missing-image-1440x900.png` })
})

test('生成规定分辨率和核心页面验收截图', async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), '桌面截图仅在桌面项目生成')
  const desktopShots = [
    ['/gov/pingxiang', 'overview'], ['/gov/pingxiang/companies', 'companies'], ['/gov/pingxiang/companies/px-company-001', 'company-detail'],
    ['/gov/pingxiang/hazards', 'hazards'], ['/gov/pingxiang/inspections', 'inspections'], ['/gov/pingxiang/work-permits', 'work-permits'], ['/gov/pingxiang/trainings', 'trainings'], ['/gov/pingxiang/reports/monthly', 'report-preview'],
  ] as const
  await page.setViewportSize({ width: 1920, height: 1080 })
  for (const [path, name] of desktopShots) { await page.goto(demoPath(path)); await expect(page.locator('.pxv2-shell')).toBeVisible(); await page.screenshot({ path: `${screenshotDir}/${name}-1920x1080.png` }) }
  const drawerShots = [
    ['/gov/pingxiang/hazards', 'hazard-drawer'], ['/gov/pingxiang/inspections', 'inspection-drawer'], ['/gov/pingxiang/work-permits', 'permit-drawer'], ['/gov/pingxiang/trainings', 'training-drawer'],
  ] as const
  for (const [path, name] of drawerShots) { await page.goto(demoPath(path)); await page.locator('tbody tr').first().getByRole('link', { name: '快速查看' }).click(); await expect(page.locator('.pxv21-drawer')).toBeVisible(); await page.screenshot({ path: `${screenshotDir}/${name}-1920x1080.png` }) }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(demoPath('/gov/pingxiang')); await page.screenshot({ path: `${screenshotDir}/overview-1440x900.png` })
  await page.goto(demoPath('/gov/pingxiang/hazards')); await page.locator('tbody tr').first().getByRole('link', { name: '快速查看' }).click(); await page.screenshot({ path: `${screenshotDir}/hazard-drawer-1440x900.png` })
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto(demoPath('/gov/pingxiang')); await page.screenshot({ path: `${screenshotDir}/overview-1366x768.png` })
  await page.goto(demoPath('/gov/pingxiang/inspections')); await page.screenshot({ path: `${screenshotDir}/inspections-1366x768.png` })
})

test('移动端企业清单、全屏抽屉和详情页可用', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(demoPath('/gov/pingxiang/companies'))
  await expect(page.locator('.pxv2-shell')).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/mobile-companies-390x844.png`, fullPage: true })
  await page.locator('tbody tr').first().getByRole('link', { name: '快速查看' }).click()
  const drawer = page.locator('.pxv21-drawer')
  await expect(drawer).toBeVisible()
  const box = await drawer.boundingBox()
  expect(Math.round(box?.width || 0)).toBe(390)
  await page.screenshot({ path: `${screenshotDir}/mobile-drawer-390x844.png` })
  await drawer.getByRole('link', { name: /查看完整记录/ }).click()
  await page.screenshot({ path: `${screenshotDir}/mobile-detail-390x844.png`, fullPage: true })
})
