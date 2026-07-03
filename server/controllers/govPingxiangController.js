import { buildPingxiangDashboardData } from '../services/govPingxiangDashboardService.js'

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

export const handleGovPingxiangDashboard = async (request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { success: false, message: 'method not allowed' })
    return
  }

  try {
    const dashboard = await buildPingxiangDashboardData()
    sendJson(response, 200, {
      success: true,
      ...dashboard,
    })
  } catch (error) {
    console.error('[gov:pingxiang] dashboard read failed', error)
    sendJson(response, 200, {
      success: true,
      project_id: 'pingxiang',
      county_name: '平乡县',
      source: 'caoliao',
      demo_data: false,
      generated_at: new Date().toISOString(),
      summary: {
        company_count: 0,
        hazard_count: 0,
        patrol_count: 0,
        work_permit_count: 0,
        training_count: 0,
        closed_hazard_count: 0,
        pending_hazard_count: 0,
      },
      companies: [],
      hazard_reports: [],
      patrol_records: [],
      work_permits: [],
      training_exam_records: [],
      warnings: [
        {
          type: 'dashboard-build-failed',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    })
  }
}
