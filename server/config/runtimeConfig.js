const trueValues = new Set(['1', 'true', 'yes', 'on'])

export const readBoolean = (name, fallback = false) => {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  return trueValues.has(String(value).trim().toLowerCase())
}

export const getRuntimeConfig = () => ({
  pingxiangDataSource: process.env.PINGXIANG_DATA_SOURCE || 'demo',
  mysqlWriteEnabled: readBoolean('MYSQL_WRITE_ENABLED', false),
  webhookAuthRequired: readBoolean('WEBHOOK_AUTH_REQUIRED', false),
  caoliaoConnectorKey: process.env.CAOLIAO_CONNECTOR_KEY || 'caoliao-pingxiang-test',
  caoliaoSourceEnvironment: normalizeSourceEnvironment(
    process.env.CAOLIAO_SOURCE_ENVIRONMENT || 'test',
  ),
  internalDataApiKey: process.env.INTERNAL_DATA_API_KEY || '',
  internalDataAllowLoopback: readBoolean('INTERNAL_DATA_ALLOW_LOOPBACK', false),
  webhookSecret: process.env.CAOLIAO_WEBHOOK_SECRET || '',
})

export const normalizeSourceEnvironment = value => {
  const normalized = String(value || '').trim().toLowerCase()
  return ['demo', 'test', 'real'].includes(normalized) ? normalized : 'test'
}
