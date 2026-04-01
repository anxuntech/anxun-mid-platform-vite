# 草料 Webhook 线上承载最小落地

本目录只负责让 `POST /api/caoliao/webhook` 具备线上承载能力，不包含字段映射和正式入库。

## 建议线上目录

- 前端静态文件：`/var/www/html`
- Webhook 服务代码：`/opt/anxun-mid-platform-vite`

## 远端准备

1. 安装 Node 20
2. 安装 pm2
3. 将 `deploy/nginx/caoliao-webhook.conf` 合入站点 `server` 配置
4. 重载 Nginx

## pm2 启动

```bash
cd /opt/anxun-mid-platform-vite
chmod +x deploy/webhook/reload-webhook.sh
WEBHOOK_PORT=8787 ./deploy/webhook/reload-webhook.sh /opt/anxun-mid-platform-vite 8787
```

## 线上验证

```bash
curl -X POST "https://<你的域名>/api/caoliao/webhook" \
  -H "Content-Type: application/json" \
  -d '{"formType":"task","title":"deploy check"}'
```

预期返回：

```json
{"success":true,"message":"received"}
```
