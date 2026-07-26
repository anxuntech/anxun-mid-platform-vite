import { buildPingxiangMysqlDashboardData } from './govPingxiangMysqlService.js'

export const buildProtectedPingxiangData = async ({
  projectId = 'pingxiang',
  sourceEnvironment,
} = {}) => {
  if (String(process.env.PINGXIANG_DATA_SOURCE || '').toLowerCase() !== 'mysql') {
    throw new Error('real-data-source-disabled')
  }
  return buildPingxiangMysqlDashboardData({
    projectId,
    requestedEnvironment: sourceEnvironment,
  })
}
