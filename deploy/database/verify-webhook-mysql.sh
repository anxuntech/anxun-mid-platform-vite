#!/usr/bin/env sh
set -eu

APP_DIR="${1:-/opt/anxun-mid-platform-vite}"
ENV_FILE="${2:-/etc/anxun-mid-platform.env}"
PORT="${P1_WEBHOOK_VERIFY_PORT:-8792}"
FAILURE_PORT="${P1_WEBHOOK_FAILURE_PORT:-8793}"
LOG_FILE="/tmp/anxun-p1-webhook-mysql.log"
FAILURE_LOG_FILE="/tmp/anxun-p1-webhook-failure.log"
PAYLOAD_FILE="/tmp/anxun-p1-webhook-payload.json"
RESPONSE_FILE="/tmp/anxun-p1-webhook-response.json"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[verify:webhook] environment file missing: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

cleanup() {
  for pid in "${server_pid:-}" "${failure_pid:-}"; do
    if [ -n "${pid}" ]; then
      kill "${pid}" >/dev/null 2>&1 || true
      wait "${pid}" >/dev/null 2>&1 || true
    fi
  done
  rm -f "${LOG_FILE}" "${FAILURE_LOG_FILE}" "${PAYLOAD_FILE}" "${RESPONSE_FILE}"
}
trap cleanup EXIT

serial_number="P1-WEBHOOK-$(date +%s)-$$"
cat >"${PAYLOAD_FILE}" <<JSON
{
  "ref_data": {
    "serial_number": "${serial_number}",
    "form": {
      "name": "平乡县宏达童车配件有限公司设备巡检",
      "number": "D108"
    },
    "fields": [
      { "name": "企业名称", "value": "平乡县宏达童车配件有限公司" },
      { "name": "检查结果", "value": "设备运行正常" },
      { "name": "检查人", "value": "P1链路验证" }
    ]
  }
}
JSON

wait_for_service() {
  target_port="$1"
  target_log="$2"
  attempt=0
  until curl -fsS "http://127.0.0.1:${target_port}/api/caoliao/health" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "${attempt}" -ge 30 ]; then
      cat "${target_log}" >&2
      echo "[verify:webhook] service did not become ready on ${target_port}" >&2
      exit 1
    fi
    sleep 0.2
  done
}

post_webhook() {
  target_port="$1"
  curl -fsS \
    -H 'Content-Type: application/json' \
    -H "X-Anxun-Webhook-Secret: ${CAOLIAO_WEBHOOK_SECRET}" \
    --data-binary "@${PAYLOAD_FILE}" \
    "http://127.0.0.1:${target_port}/api/caoliao/webhook"
}

cd "${APP_DIR}"
WEBHOOK_PORT="${PORT}" \
MYSQL_WRITE_ENABLED=true \
CAOLIAO_CONNECTOR_KEY=caoliao-pingxiang-test \
CAOLIAO_SOURCE_ENVIRONMENT=test \
WEBHOOK_AUTH_REQUIRED=true \
node server/index.js >"${LOG_FILE}" 2>&1 &
server_pid=$!
wait_for_service "${PORT}" "${LOG_FILE}"

post_webhook "${PORT}" >"${RESPONSE_FILE}"
post_webhook "${PORT}" >/dev/null

node - "${RESPONSE_FILE}" <<'NODE'
const fs = require('node:fs')
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
if (payload.success !== true || payload.message !== 'received') {
  throw new Error('webhook-acknowledgement-mismatch')
}
NODE

export MYSQL_PWD="${DB_PASSWORD}"
verification="$(
  mysql \
    --connect-timeout=8 \
    -N -B \
    -h "${DB_HOST}" \
    -P "${DB_PORT:-3306}" \
    -u "${DB_USER}" \
    "${DB_NAME}" \
    -e "SELECT CONCAT(e.parse_status, ':', COUNT(DISTINCT e.event_id), ':', COUNT(DISTINCT b.record_id)) FROM webhook_events e LEFT JOIN business_records b ON b.raw_event_id = e.event_id WHERE e.source_event_id = CONCAT('D108:', '${serial_number}') GROUP BY e.parse_status;"
)"
unset MYSQL_PWD

if [ "${verification}" != "processed:1:1" ]; then
  echo "[verify:webhook] unexpected database result: ${verification}" >&2
  exit 1
fi

WEBHOOK_PORT="${FAILURE_PORT}" \
DB_HOST=127.0.0.1 \
DB_PORT=1 \
DB_CONNECT_TIMEOUT_MS=2500 \
MYSQL_WRITE_ENABLED=true \
CAOLIAO_CONNECTOR_KEY=caoliao-pingxiang-test \
CAOLIAO_SOURCE_ENVIRONMENT=test \
WEBHOOK_AUTH_REQUIRED=true \
node server/index.js >"${FAILURE_LOG_FILE}" 2>&1 &
failure_pid=$!
wait_for_service "${FAILURE_PORT}" "${FAILURE_LOG_FILE}"

started_at="$(date +%s)"
post_webhook "${FAILURE_PORT}" >"${RESPONSE_FILE}"
elapsed="$(( $(date +%s) - started_at ))"
if [ "${elapsed}" -ge 5 ]; then
  echo "[verify:webhook] database failure acknowledgement took ${elapsed}s" >&2
  exit 1
fi

node - "${RESPONSE_FILE}" <<'NODE'
const fs = require('node:fs')
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
if (payload.success !== true || payload.message !== 'received') {
  throw new Error('failure-path-acknowledgement-mismatch')
}
NODE

if grep -F "${CAOLIAO_WEBHOOK_SECRET}" "${LOG_FILE}" "${FAILURE_LOG_FILE}" >/dev/null 2>&1; then
  echo "[verify:webhook] webhook secret appeared in service logs" >&2
  exit 1
fi

echo "[verify:webhook] MySQL write, deduplication and sub-5-second failure fallback passed"
