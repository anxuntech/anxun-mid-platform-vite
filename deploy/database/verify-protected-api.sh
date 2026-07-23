#!/usr/bin/env sh
set -eu

APP_DIR="${1:-/opt/anxun-mid-platform-vite}"
ENV_FILE="${2:-/etc/anxun-mid-platform.env}"
PORT="${P1_VERIFY_PORT:-8791}"
LOG_FILE="/tmp/anxun-p1-protected-api.log"
BODY_FILE="/tmp/anxun-p1-protected-api.json"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[verify:api] environment file missing: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

cleanup() {
  if [ -n "${server_pid:-}" ]; then
    kill "${server_pid}" >/dev/null 2>&1 || true
    wait "${server_pid}" >/dev/null 2>&1 || true
  fi
  rm -f "${LOG_FILE}" "${BODY_FILE}"
}
trap cleanup EXIT

cd "${APP_DIR}"
WEBHOOK_PORT="${PORT}" \
PINGXIANG_DATA_SOURCE=mysql \
PINGXIANG_SOURCE_ENVIRONMENT=test \
MYSQL_WRITE_ENABLED=false \
node server/index.js >"${LOG_FILE}" 2>&1 &
server_pid=$!

attempt=0
until curl -fsS "http://127.0.0.1:${PORT}/api/caoliao/health" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge 30 ]; then
    cat "${LOG_FILE}" >&2
    echo "[verify:api] service did not become ready" >&2
    exit 1
  fi
  sleep 0.2
done

unauthorized_status="$(
  curl -sS -o /dev/null -w '%{http_code}' \
    "http://127.0.0.1:${PORT}/api/gov/pingxiang/dashboard"
)"
if [ "${unauthorized_status}" != "401" ]; then
  echo "[verify:api] expected unauthenticated status 401, got ${unauthorized_status}" >&2
  exit 1
fi

curl -fsS \
  -H "X-Anxun-Internal-Key: ${INTERNAL_DATA_API_KEY}" \
  "http://127.0.0.1:${PORT}/api/gov/pingxiang/dashboard" \
  >"${BODY_FILE}"

node - "${BODY_FILE}" <<'NODE'
const fs = require('node:fs')
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
if (!payload.success) throw new Error('protected-api-success-flag-missing')
if (payload.source !== 'mysql') throw new Error('protected-api-source-mismatch')
if (payload.source_environment !== 'test') throw new Error('protected-api-environment-mismatch')
if (!Array.isArray(payload.companies) || payload.companies.length === 0) {
  throw new Error('protected-api-companies-missing')
}
if (!Array.isArray(payload.patrol_records) || payload.patrol_records.length === 0) {
  throw new Error('protected-api-records-missing')
}
console.log(JSON.stringify({
  success: payload.success,
  source: payload.source,
  sourceEnvironment: payload.source_environment,
  companies: payload.companies.length,
  hazards: payload.hazard_reports.length,
  patrols: payload.patrol_records.length,
  workPermits: payload.work_permits.length,
  trainings: payload.training_exam_records.length,
}))
NODE

if grep -F "${INTERNAL_DATA_API_KEY}" "${LOG_FILE}" >/dev/null 2>&1; then
  echo "[verify:api] internal key appeared in service logs" >&2
  exit 1
fi

echo "[verify:api] protected MySQL dashboard passed; unauthenticated access was denied"
