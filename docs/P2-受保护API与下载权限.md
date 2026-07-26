# P2 受保护 API 与下载权限

## 1. 认证接口

| 方法 | 地址 | 保护 |
| --- | --- | --- |
| `POST` | `/api/auth/login` | 可信来源、请求体限制、登录限流、失败延迟、账号锁定 |
| `GET` | `/api/auth/session` | 服务端会话 Cookie |
| `POST` | `/api/auth/logout` | 服务端会话、可信来源、CSRF |

## 2. 平乡正式数据接口

以下接口全部要求服务端会话或受控内部密钥，并校验 `pingxiang` 项目绑定：

| 方法 | 地址 | 附加校验 |
| --- | --- | --- |
| `GET` | `/api/gov/pingxiang/dashboard` | 项目范围 |
| `GET` | `/api/gov/pingxiang/companies` | 项目范围 |
| `GET` | `/api/gov/pingxiang/companies/:companyId` | 项目范围、企业存在性 |
| `GET` | `/api/gov/pingxiang/records` | 项目范围、记录类型和企业筛选白名单 |
| `GET` | `/api/gov/pingxiang/records/:recordId` | 项目范围、记录存在性、敏感详情审计 |
| `GET` | `/api/gov/pingxiang/reports` | 项目范围 |
| `POST` | `/api/gov/pingxiang/exports/report-pdf` | 汇总下载权限、可信来源、CSRF、下载审计 |
| `POST` | `/api/gov/pingxiang/exports/summary` | 汇总下载权限、可信来源、CSRF、下载审计 |
| `POST` | `/api/gov/pingxiang/exports/business-summary` | 四项业务汇总下载权限、可信来源、CSRF、下载审计 |
| `POST` | `/api/gov/pingxiang/exports/company-detail` | 管理员或明细授权、可信来源、CSRF、下载审计 |

响应语义：

- 未登录或会话失效：`401`
- 已登录但无项目或操作权限：`403`
- 授权范围内找不到目标资源：`404`
- 请求过于频繁：`429`

## 3. 草料接口

| 方法 | 地址 | 保护 |
| --- | --- | --- |
| `POST` | `/api/caoliao/webhook` | 生产共享密钥、请求体限制、频率限制；拒绝请求不进入业务数据 |
| `GET` | `/api/caoliao/health` | 公开，只返回健康状态 |
| `GET` | `/api/caoliao/events` | 仅管理员或内部密钥，返回裁剪诊断摘要，不返回原始 payload |
| `GET` | `/api/caoliao/service-records` | 仅管理员或内部密钥 |
| `GET` | `/api/caoliao/hazards` | 仅管理员或内部密钥 |

项目查看账号不得读取上述草料诊断接口。

## 4. 下载权限矩阵

| 下载内容 | `project_viewer` | `admin` |
| --- | --- | --- |
| 阶段报告 PDF | 允许 | 允许 |
| 企业运行汇总 Excel | 允许 | 允许 |
| 四项业务汇总 Excel | 允许 | 允许 |
| 单家企业记录明细 | 默认禁止 | 允许 |
| 原始 Webhook payload | 禁止 | 默认禁止，仅受控诊断摘要 |
| 照片/附件批量包 | 不实现 | 不实现 |

下载日志记录账号、机构、IP、北京时间、项目、下载类型、筛选条件、文件名、结果和行数，不记录密码、会话令牌或完整敏感数据。
