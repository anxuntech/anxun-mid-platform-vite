# P1 RDS MySQL 数据底座运行手册

## 安全边界

- 官网、原安全服务中台和 `/gov/pingxiang` 公共页面继续使用原有构建与路由。
- 公共平乡页面保持 `PINGXIANG_DATA_SOURCE=demo`，P2 账号认证完成前不得切换。
- MySQL 写入由 `MYSQL_WRITE_ENABLED` 独立控制，默认关闭。
- Webhook 强制认证仅在草料侧认证方式完成真实验证后启用。
- 数据库只使用 RDS 内网地址，不申请公网地址。
- 数据库凭据只保存在 ECS 的 `/etc/anxun-mid-platform.env`，权限必须为 `600`。

## 部署顺序

1. 备份线上 JSONL 并核验 SHA-256。
2. 通过 RDS 控制面配置 ECS 单 IP 白名单、数据库和普通账号。
3. 在 ECS 写入受限环境文件，并确认运行账号仅有业务读写权限。
4. 使用维护账号执行 `npm run db:migrate`。
5. 执行 `npm run db:seed:pingxiang`，默认只启用测试连接器，真实连接器保持禁用。
6. 执行 `npm run db:check` 验证版本、时区和数据库名。
7. 先用 `npm run db:import:jsonl -- --dry-run` 对账，再执行正式测试数据导入。
8. 验证重复导入、隔离数据和重放结果。
9. 设置 `MYSQL_WRITE_ENABLED=true` 并重载 PM2，仅开启双写，不切换公共页面。
10. 验证 JSONL 与 MySQL 同时落盘、数据库失败时 Webhook 仍能应答。

## 环境变量

以仓库中的 `.env.example` 为字段清单。生产值不得写入 Git、日志、截图或报告。

```text
PINGXIANG_DATA_SOURCE=demo
PINGXIANG_SOURCE_ENVIRONMENT=real
MYSQL_WRITE_ENABLED=true
WEBHOOK_AUTH_REQUIRED=false
INTERNAL_DATA_ALLOW_LOOPBACK=false
DB_CONNECT_TIMEOUT_MS=2500
```

`INTERNAL_DATA_API_KEY` 必须设置为随机高强度值。真实数据接口调用必须携带内部密钥，且反向代理请求即使源地址表现为本机，也不会自动绕过认证。

## JSONL 备份与恢复

定时备份脚本：

```text
deploy/database/backup-jsonl.sh
```

恢复前必须先停止写入并保留当前文件：

```sh
pm2 stop anxun-caoliao-webhook
cp /opt/anxun-mid-platform-vite/.data/caoliao-business-events.jsonl \
  /opt/backups/anxun-mid-platform-vite/jsonl/before-restore.jsonl
gzip -dc /opt/backups/anxun-mid-platform-vite/jsonl/<backup>.jsonl.gz \
  > /opt/anxun-mid-platform-vite/.data/caoliao-business-events.jsonl
pm2 start anxun-caoliao-webhook
```

恢复后必须重新计算行数和 SHA-256，并用只读接口核验。

## 应用回退

生产异常时按以下顺序回退：

1. 在 `/etc/anxun-mid-platform.env` 设置 `MYSQL_WRITE_ENABLED=false`。
2. 保持 `PINGXIANG_DATA_SOURCE=demo`。
3. 重载 PM2，Webhook 继续写入 JSONL。
4. 回退应用代码到上一稳定提交。
5. 不删除 MySQL 中已经保存的原始事件。
6. 修复后使用事件 ID 或重放任务恢复结构化处理，唯一约束阻止重复业务记录。

## 数据库迁移回退

已产生业务数据后不得执行结构删除。正常生产回退只关闭功能开关并保留表和原始事件。

索引类增量迁移在人工核对后可按版本回退：

```sh
ALLOW_DATABASE_MIGRATION_ROLLBACK=true npm run db:rollback -- 003_connector_scoped_dedup
```

初始结构只允许在全新、空的预生产数据库中回退：

```sh
ALLOW_DATABASE_MIGRATION_ROLLBACK=true \
ALLOW_EMPTY_DATABASE_ROLLBACK=true \
npm run db:rollback -- 001_initial_schema
```

脚本会检查核心表；任一表存在数据就拒绝回退。生产库不得设置该确认变量。

## JSONL 退出条件

满足以下全部条件后，JSONL 才能退出业务查询职责：

1. MySQL 原始事件和结构化写入持续稳定。
2. 重复请求、失败隔离和重放测试通过。
3. 连续观察期内 JSONL 与 MySQL 对账无丢失。
4. RDS 自动备份和恢复演练通过。
5. 政府端聚合结果与验收口径一致。

退出后 JSONL 仍保留为短期原始备份和应急恢复来源，不作为长期统计主数据源。
