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
  'pingxiang-demo': {
    routeSlug: 'pingxiang-demo',
    projectId: 'pingxiang',
    countyName: '平乡县',
    platformTitle: '平乡县企业现场安全管理运行平台',
    platformSubtitle: '四项功能试点演示环境',
    basePath: '/gov/pingxiang-demo',
    mode: 'demo',
    dashboardEndpoint: '/api/gov/pingxiang/dashboard',
  },
  'ningjin-demo': {
    routeSlug: 'ningjin-demo',
    projectId: 'ningjin-demo',
    countyName: '宁晋县',
    platformTitle: '宁晋县企业现场安全管理运行平台',
    platformSubtitle: '多县域配置能力演示环境',
    basePath: '/gov/ningjin-demo',
    mode: 'demo',
    dashboardEndpoint: '/api/gov/projects/ningjin-demo/dashboard',
    companyPrefix: '试点演示企业',
  },
}

export const resolveGovProjectConfig = (pathname: string) => {
  const match = pathname.match(/^\/gov\/([^/]+)(?:\/|$)/)
  return match ? configs[match[1]] || null : null
}

export const govProjectConfigs = Object.values(configs)
