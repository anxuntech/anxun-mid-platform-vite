import mysql from 'mysql2/promise'
import { readBoolean } from '../config/runtimeConfig.js'

let runtimePool

export const readDatabaseConfig = ({ requireDatabase = true } = {}) => {
  const config = {
    host: process.env.DB_HOST || '',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    timezone: process.env.DB_TIME_ZONE || '+08:00',
    dateStrings: true,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 2_500),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: readBoolean('DB_SSL', false) ? { rejectUnauthorized: true } : undefined,
  }

  const missing = ['host', 'user', 'password']
    .concat(requireDatabase ? ['database'] : [])
    .filter(key => !config[key])
  if (missing.length) throw new Error(`database-config-missing:${missing.join(',')}`)
  return config
}

export const getMysqlPool = () => {
  if (!runtimePool) {
    runtimePool = mysql.createPool({
      ...readDatabaseConfig(),
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 5),
      maxIdle: Number(process.env.DB_POOL_SIZE || 5),
      idleTimeout: 60_000,
      queueLimit: 0,
    })
  }
  return runtimePool
}

export const createMigrationConnection = () =>
  mysql.createConnection({
    ...readDatabaseConfig(),
    multipleStatements: true,
  })

export const closeMysqlPool = async () => {
  if (!runtimePool) return
  const pool = runtimePool
  runtimePool = undefined
  await pool.end()
}

export const checkMysqlHealth = async () => {
  const pool = getMysqlPool()
  const [rows] = await pool.query(
    `SELECT VERSION() AS version,
            CURRENT_TIMESTAMP(3) AS now_business,
            @@session.time_zone AS session_time_zone,
            DATABASE() AS database_name`,
  )
  return rows[0]
}
