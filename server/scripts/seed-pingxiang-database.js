import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { closeMysqlPool, getMysqlPool } from '../db/mysql.js'
import { normalizeCompanyKey } from '../services/eventIdentity.js'

const companyMap = JSON.parse(
  await readFile(path.resolve('server', 'config', 'pingxiangCompanyMap.json'), 'utf8'),
)
const pool = getMysqlPool()
const connection = await pool.getConnection()

try {
  await connection.beginTransaction()
  await connection.execute(
    `INSERT INTO counties (county_id, county_slug, county_name)
     VALUES ('county-pingxiang', 'pingxiang', '平乡县')
     ON DUPLICATE KEY UPDATE county_name = VALUES(county_name), status = 'active'`,
  )
  await connection.execute(
    `INSERT INTO projects (project_id, county_id, project_slug, project_name)
     VALUES ('pingxiang', 'county-pingxiang', 'pingxiang', '平乡县企业安全管理四项闭环试点')
     ON DUPLICATE KEY UPDATE project_name = VALUES(project_name), status = 'active'`,
  )
  await connection.execute(
    `INSERT INTO source_connectors (
       connector_id, connector_key, source_system, source_environment, enabled
     ) VALUES
       ('connector-caoliao-pingxiang-test', 'caoliao-pingxiang-test', 'caoliao', 'test', 1),
       ('connector-caoliao-pingxiang-real', 'caoliao-pingxiang-real', 'caoliao', 'real', 0)
     ON DUPLICATE KEY UPDATE
       source_system = VALUES(source_system),
       source_environment = VALUES(source_environment)`,
  )

  for (const company of companyMap) {
    await connection.execute(
      `INSERT INTO companies (company_id, project_id, company_name, status)
       VALUES (?, 'pingxiang', ?, 'active')
       ON DUPLICATE KEY UPDATE company_name = VALUES(company_name), status = 'active'`,
      [company.company_id, company.company_name],
    )
    const sourceName = company.caoliao_enterprise_name || company.company_name
    await connection.execute(
      `INSERT INTO source_company_mappings (
         mapping_id, connector_id, company_id, source_company_key,
         source_company_name, source_company_name_normalized
       ) VALUES (?, 'connector-caoliao-pingxiang-test', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         company_id = VALUES(company_id),
         source_company_name = VALUES(source_company_name),
         source_company_name_normalized = VALUES(source_company_name_normalized),
         status = 'active'`,
      [randomUUID(), company.company_id, normalizeCompanyKey(sourceName), sourceName, normalizeCompanyKey(sourceName)],
    )
  }
  await connection.commit()
  console.log(JSON.stringify({
    success: true,
    county: '平乡县',
    companies: companyMap.length,
    testConnectorEnabled: true,
    realConnectorEnabled: false,
  }))
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release()
  await closeMysqlPool()
}
