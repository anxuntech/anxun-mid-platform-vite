import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { buildPingxiangDashboardData as buildJsonlDashboard } from './govPingxiangDashboardService.js'
import { buildPingxiangMysqlDashboardData } from './govPingxiangMysqlService.js'

export const buildProtectedPingxiangData = async () => {
  const source = getRuntimeConfig().pingxiangDataSource
  if (source === 'mysql') return buildPingxiangMysqlDashboardData()
  if (source === 'jsonl') return buildJsonlDashboard()
  throw new Error('real-data-source-disabled')
}
