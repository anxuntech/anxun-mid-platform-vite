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
mkdir -p .logs .data
chmod 700 .logs .data
find .logs .data -maxdepth 1 -type f -exec chmod 600 {} \;

ENV_FILE="${ANXUN_ENV_FILE:-/etc/anxun-mid-platform.env}"
if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

export NODE_ENV=production
export WEBHOOK_PORT="${WEBHOOK_PORT_VALUE}"

npm ci --omit=dev

MIGRATION_ENV_FILE="${ANXUN_MIGRATION_ENV_FILE:-/root/.config/anxun/rds-migration.env}"
if [ -f "${MIGRATION_ENV_FILE}" ]; then
  (
    set -a
    # shellcheck disable=SC1090
    . "${MIGRATION_ENV_FILE}"
    set +a
    npm run db:migrate
  )
else
  echo "[deploy] database migration skipped: ${MIGRATION_ENV_FILE} not found"
fi

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 status anxun-caoliao-webhook
