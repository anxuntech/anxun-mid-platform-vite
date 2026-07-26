# P3 AI 数据助手与多县域运行说明

## 当前范围

- AI 数据助手首期仅向安巡管理员开放。
- AI 查询只读取当前登录账号已绑定的项目。
- 首期数据环境固定为 `test`，不得用于对外正式结论。
- 平乡公共演示页继续使用前端演示数据，不读取 RDS 测试数据。
- 政府第三方平台接口本期暂缓，不开放新外部接口。

## 安全链路

1. 浏览器使用 P2 会话 Cookie 与 CSRF 令牌发起请求。
2. 服务端重新校验登录、角色和项目绑定，不信任前端传入的数据范围。
3. DeepSeek 仅将问题解析为固定意图和有限参数，不接触数据库连接、SQL、密码或原始全量数据。
4. 服务端对模型结果执行严格字段白名单、意图白名单和最长 90 天时间范围校验。
5. 固定查询执行器按 `project_id` 与 `source_environment=test` 读取结构化数据。
6. 服务端生成最终数字、清单和说明，模型不负责计算统计数字。
7. 查询写入 `ai_query_audit_logs`，记录脱敏问题、意图、范围、数量、耗时、令牌数和结果状态。

## 受控意图

- 隐患查询
- 未闭环隐患查询
- 近期无有效记录企业查询
- 巡检点检查询
- 作业票查询
- 培训考试查询
- 企业汇总
- 项目汇总
- 时段对比

不支持任意 SQL、数据库结构查询、跨项目查询和权限外数据请求。

## 运行配置

配置保存在服务器受限环境文件中，不写入 Git：

```text
P3_AI_ASSISTANT_ENABLED=true
P3_AI_ADMIN_ONLY=true
P3_AI_SOURCE_ENVIRONMENT=test
P3_AI_DAILY_LIMIT=20
P3_AI_RATE_LIMIT_PER_MINUTE=20
P3_AI_TIMEOUT_MS=12000
P3_AI_MAX_OUTPUT_TOKENS=400
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=由运维安全配置
```

## 页面与接口

- 平乡正式入口：`/gov/pingxiang`
- 平乡公开演示：`/gov/pingxiang-demo`
- 第二县域演示：`/gov/ningjin-demo`
- 平乡 AI 兼容接口：`POST /api/gov/pingxiang/assistant/query`
- 项目化 AI 接口：`POST /api/gov/projects/:projectId/assistant/query`
- 项目化只读接口：`GET /api/gov/projects/:projectId/dashboard`

第二县域仅使用独立演示数据，企业 ID、记录 ID 和县域文案均与平乡隔离。

## 降级与限额

- DeepSeek 超时、空响应或暂不可用时，服务端使用固定关键词解析器降级。
- 无论模型是否降级，实际数据查询仍由同一个固定查询执行器完成。
- 每账号每天默认最多 20 次，接口另有每分钟限流。
- 页面最多展示 10 条记录，查询侧最多处理 100 条摘要。
- 所有回答带统计时间、企业范围、状态范围和测试数据标识。

## 回退

1. 将 `P3_AI_ASSISTANT_ENABLED=false` 并重载 PM2，可立即关闭助手，不影响 P1/P2。
2. 前端回退到部署前 Git 标签或提交，平乡原页面和 P2 登录仍保持可用。
3. 只有确认不再需要审计记录时，才允许单独执行 `006_p3_ai_assistant.down.sql`。
4. 禁止为了回退 AI 功能而删除 P1 业务表、P2 认证表或四类业务记录。
