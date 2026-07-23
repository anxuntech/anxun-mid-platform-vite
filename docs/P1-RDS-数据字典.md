# P1 RDS MySQL 数据字典

## 主数据

| 表 | 用途 | 关键约束 |
| --- | --- | --- |
| `counties` | 县域主数据 | `county_id` 主键，县域标识唯一 |
| `projects` | 县域项目 | 归属 `county_id`，项目标识唯一 |
| `companies` | 企业主数据 | 归属 `project_id`，项目内企业名称唯一 |
| `source_connectors` | 来源连接器 | 区分 `demo/test/real`，默认可禁用 |
| `source_company_mappings` | 草料企业映射 | 将来源企业、表单和分区映射到稳定 `company_id` |

## 事件与业务记录

| 表 | 用途 | 关键约束 |
| --- | --- | --- |
| `webhook_events` | 原始 Webhook 事件 | 来源、环境和事件指纹联合唯一 |
| `business_records` | 通用业务记录 | 来源记录在连接器和环境内唯一 |
| `hazard_records` | 隐患记录 | 一对一关联通用记录 |
| `inspection_records` | 巡检点检记录 | 一对一关联通用记录 |
| `work_permit_records` | 作业票记录 | 一对一关联通用记录 |
| `training_records` | 培训考试记录 | 一对一关联通用记录 |
| `record_attachments` | 附件元数据 | 只保存名称、类型、大小、URL，不保存二进制 |

所有业务记录都通过稳定 ID 关联县域、项目、企业和原始事件，并保留 `source_environment`，防止测试数据进入真实统计。

## 迁移、质量和重放

| 表 | 用途 |
| --- | --- |
| `data_import_batches` | 记录 JSONL 导入批次、进度和对账数量 |
| `migration_logs` | 记录批次中的单条迁移结果 |
| `data_quality_issues` | 隔离未知企业、无法解析或缺失字段的数据 |
| `event_replay_jobs` | 按原始事件创建可追踪的重放任务 |
| `schema_migrations` | 记录已应用迁移及校验和 |

## 索引原则

- 县域、项目、企业和环境查询字段均建立组合索引。
- 原始事件指纹和来源业务记录建立唯一约束。
- 状态、发生时间和企业字段建立面向政府端统计的组合索引。
- 外键保证主数据、原始事件、通用记录和四类业务明细之间的一致性。
