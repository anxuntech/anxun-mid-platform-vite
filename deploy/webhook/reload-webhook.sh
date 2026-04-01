#!/usr/bin/env sh
set -eu

APP_DIR="${1:-/opt/anxun-mid-platform-vite}"
WEBHOOK_PORT_VALUE="${2:-${WEBHOOK_PORT:-8787}}"

echo "[deploy] app dir: ${APP_DIR}"
echo "[deploy] webhook port: ${WEBHOOK_PORT_VALUE}"

if ! command -v node >/dev/null 2>&1; then
  echo "[deploy] node is required on the remote host"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] pm2 is required on the remote host"
  exit 1
fi

cd "${APP_DIR}"
mkdir -p .logs

export NODE_ENV=production
export WEBHOOK_PORT="${WEBHOOK_PORT_VALUE}"

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 status anxun-caoliao-webhook
