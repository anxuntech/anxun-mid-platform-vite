# P1 RDS MySQL 正式数据底座实施验收报告

## 仓库与工作区保护

- 原工作区：`E:\xmlj\anxun-mid-platform-vite`
- 原分支及提交：`main`，`cc9b4fd158252348bb8a244e82858362eeaf832e`
- 原工作区保持原样，未清理、暂存、提交、合并或覆盖。
- P1 工作区：`E:\xmlj\anxun-mid-platform-vite-p1-rds`
- P1 分支：`codex/p1-rds-production-data-foundation`
- 基线：`origin/main` 的 `5007e74573eeaeaacfbbe3c4e9a6a1e9cd2b2fe2`
- 授权提交：`c26af3a`，`chore: authorize P1 production data foundation`

## RDS 基础配置

| 项目 | 实际结果 |
| --- | --- |
| 实例 | `rm-2zek5t43u213g1p4p` |
| 状态 | Running |
| 地域 / 可用区 | 北京 / `cn-beijing-l` |
| 数据库 | MySQL 8.0.36 |
| 系列 / 规格 | Basic / `mysql.n2e.medium.1` |
| 存储 | 20 GB ESSD PL0 |
| 网络 | 仅内网，端口 3306 |
| VPC | `vpc-2zerq3kttgj8idde79hi4` |
| 内网地址 | `rm-2zek5t43u213g1p4p.mysql.rds.aliyuncs.com` |
| 白名单 | 仅 ECS 私网地址 `172.20.19.247` |
| 自动小版本升级 | Auto |
| 维护窗口 | UTC 18:00-22:00 |
| SSL | 当前未启用 |
| TDE | 当前未启用 |

ECS 已完成 DNS 和 3306 端口验证，连接成功。未申请 RDS 公网地址。

## 数据库、账号与凭据

- 已创建业务库 `anxun_platform`，字符集 `utf8mb4`，排序规则 `utf8mb4_0900_ai_ci`。
- `anxun_app` 保留为应急管理账号，已轮换临时密码，不进入 Node 配置。
- `anxun_codex` 为 P1 维护账号，只授权 `anxun_platform` 的迁移和维护权限。
- `anxun_runtime` 为线上运行账号；实际数据库权限已收紧为 `SELECT / INSERT / UPDATE`，无普通建表、改表和删表权限。
- RDS 普通账号仍带有阿里云托管账号的系统只读元数据权限，这是服务侧内置行为。
- 应急凭据：`/root/.config/anxun/rds-emergency.env`
- 维护凭据：`/root/.config/anxun/rds-maintenance.env`
- 运行凭据：`/etc/anxun-mid-platform.env`
- 三个文件均为 `root:root`、权限 `600`；报告、Git 和普通日志不包含明文凭据。

## 备份

- RDS 自动全量备份：每天执行，UTC 18:00-19:00，保留 14 天。
- 日志备份：启用，保留 14 天。
- 手工初始化快照：已成功，快照备份 ID `3089519716`。
- RDS 新版 PITR Protection 当前为关闭；现阶段保留日志备份，不虚报为已开启新版 PITR。
- 原 JSONL 首次核验：200 行，577,358 字节。
- 原 JSONL 首次 SHA-256：`c5b5598d2a2fdb9f1b8d775e832964936e8a9950c008a585017648a80c3d9861`。
- 原路径备份：`/opt/anxun-mid-platform-vite/.data/caoliao-business-events.jsonl.pre-p1-20260723-120856.bak`
- 独立备份：`/opt/backups/anxun-mid-platform-vite/jsonl/caoliao-business-events.pre-p1-20260723-120856.jsonl`
- 每日 JSONL 定时备份已启用：`anxun-jsonl-backup.timer`。
- P1 生产验证后 JSONL 为 202 行；已再次生成压缩备份和 SHA-256 文件。
- ECS 没有现成 OSS 命令行凭据，因此本轮未虚报 OSS 备份。

## 表结构与迁移

已应用：

1. `001_initial_schema`
2. `002_quality_issue_dedup`
3. `003_connector_scoped_dedup`

核心实体：

- 县域、项目、企业。
- 来源连接器和企业映射。
- 原始 Webhook 事件。
- 通用业务记录。
- 隐患、巡检、作业票、培训四类业务明细。
- 附件元数据。
- 导入批次、迁移日志、数据质量问题和重放任务。

原始事件按“来源连接器 + 来源事件号”去重，业务记录按原始事件唯一，质量问题按“事件 + 问题类型”去重；附件只保存元数据和 URL，不保存二进制。

## 历史 JSONL 迁移对账

历史数据全部标记为 `source_environment=test`。

| 指标 | 首次导入 |
| --- | ---: |
| JSONL 总行数 | 200 |
| 有效 JSON | 200 |
| 原始事件入库 | 200 |
| 结构化成功 | 80 |
| 企业未匹配隔离 | 112 |
| 类型不支持隔离 | 8 |
| 失败 | 0 |
| 真实环境事件 | 0 |

结构化结果：

- 隐患：10 条。
- 巡检：70 条。
- 明确归属平乡县宏达童车配件有限公司：80 条。
- 附件元数据：0 条，源历史记录未提供可解析附件 URL。

第二次完整导入结果：

- 新增：0。
- 重复：200。
- 失败：0。

说明：邢台新源、天成纺织及缺少企业名称的数据没有被擅自归入平乡企业，全部保留原始事件并隔离，等待人工确认映射。

## Webhook 与重放验收

- 原路径 `POST /api/caoliao/webhook` 保持不变。
- MySQL 原始事件在业务解析前保存。
- D159、D105、D107、D108、D110、D111、D112 及既有作业票、培训识别回归通过。
- D108 公网生产验证正确进入 `serviceRecord` 分支。
- JSONL 与 MySQL 双写已启用。
- 相同事件重复请求只产生 1 条原始事件和 1 条业务记录。
- 数据库不可用时，Webhook 在 5 秒内继续返回统一成功应答，JSONL 仍保留。
- 重放测试成功生成 1 条业务记录和 1 条完成任务；重复写入被拦截。
- 未识别企业和不支持类型进入隔离区，不进入政府端统计。
- Webhook 强制认证目前保持兼容模式；草料侧认证能力未完成真实验证前不启用强制认证。
- P1 共写入 4 条明确标识的技术验收事件，全部属于 `test`；最终数据库为 204 条原始事件、84 条结构化记录、120 条隔离记录、0 条真实环境记录。

## 数据服务与公开边界

- 受保护接口：`GET /api/gov/pingxiang/dashboard`
- 无内部密钥访问返回 401。
- 内部测试密钥访问 MySQL 测试环境聚合成功。
- 生产环境 `PINGXIANG_DATA_SOURCE=demo`。
- 生产环境 `MYSQL_WRITE_ENABLED=true`。
- 生产连接器仍为 `caoliao-pingxiang-test`，真实连接器存在但保持禁用。
- 公开 `/gov/pingxiang` 继续显示“演示环境”和内部演示数据。
- P2 正式账号认证完成前，不切换公开页面到 MySQL 真实数据。

## 构建与回归

- 后端测试：8 项通过。
- TypeScript：通过。
- Vite 生产构建：通过。
- Playwright：12 项通过。
- 全部平乡核心路由、下钻、分页、详情、报告和移动端回归通过。
- 线上状态：
  - 官网 200。
  - `/platform/` 200。
  - `/gov/pingxiang` 200。
  - Webhook 健康检查 200。
  - 受保护真实数据接口无密钥 401。
- 浏览器截图确认平乡页面仍明确显示“演示环境”。
- 发现的既有非阻断项：`/favicon.ico` 返回 404；本轮未扩大到 UI 修复。

## 部署与回退点

- 后端部署目录：`/opt/anxun-mid-platform-vite`
- 部署前代码备份：`/opt/backups/anxun-mid-platform-vite/p1-pre-backend-20260723-1240.tar.gz`
- MySQL 写入启用前环境备份：`/root/.config/anxun/anxun-mid-platform.env.before-mysql-write`
- JSONL 原始备份和每日压缩备份均已保留。
- 本轮未上传 `dist`，未覆盖 `/var/www/html`，未修改 Nginx。

应用异常时：

1. 将 `MYSQL_WRITE_ENABLED` 设为 `false`。
2. 保持 `PINGXIANG_DATA_SOURCE=demo`。
3. 重载 `anxun-caoliao-webhook`。
4. 使用部署前代码备份恢复后端代码。
5. 保留 MySQL 原始事件，不执行删除。
6. 修复后按事件 ID 重放。

数据库结构只有在空的预生产库中才允许使用显式回退脚本；生产数据存在时脚本会拒绝删除核心表。

## 当前未扩大事项

- 草料端认证方式尚未在真实后台确认，因此 `WEBHOOK_AUTH_REQUIRED=false`。
- 正式企业连接器和企业映射尚未启用，当前写入均为 `test`。
- SSL、TDE 和新版 PITR Protection 未启用；数据库目前仅允许同 VPC ECS 单 IP 访问。
- P2 账号认证完成前，真实数据接口不会向政府端或公众开放。
