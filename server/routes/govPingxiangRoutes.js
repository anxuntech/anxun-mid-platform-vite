import { handleGovPingxiangDashboard } from '../controllers/govPingxiangController.js'

export const isGovPingxiangRoute = request => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  return pathname === '/api/gov/pingxiang/dashboard'
}

export const handleGovPingxiangRoute = async (request, response) => {
  await handleGovPingxiangDashboard(request, response)
}
