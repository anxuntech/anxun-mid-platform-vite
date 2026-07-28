export type GovProjectConfig = {
  routeSlug: string
  projectId: string
  countyName: string
  platformTitle: string
  platformSubtitle: string
  basePath: string
  mode: 'demo' | 'real'
  dashboardEndpoint: string
  companyPrefix?: string
}

const configs: Record<string, GovProjectConfig> = {
  pingxiang: {
    routeSlug: 'pingxiang',
    projectId: 'pingxiang',
    countyName: '平乡县',
    platformTitle: '平乡县企业现场安全管理运行平台',
    platformSubtitle: '四项功能试点运行监测',
    basePath: '/gov/pingxiang',
    mode: 'real',
    dashboardEndpoint: '/api/gov/pingxiang/dashboard',
  },
}

export const resolveGovProjectConfig = (pathname: string) => {
  const match = pathname.match(/^\/gov\/([^/]+)(?:\/|$)/)
  return match ? configs[match[1]] || null : null
}

export const govProjectConfigs = Object.values(configs)
