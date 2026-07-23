#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-/root/.config/anxun/rds-maintenance.env}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[verify:rds] environment file missing: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

export MYSQL_PWD="${DB_PASSWORD}"
trap 'unset MYSQL_PWD' EXIT

mysql \
  --connect-timeout=8 \
  --default-character-set=utf8mb4 \
  -h "${DB_HOST}" \
  -P "${DB_PORT:-3306}" \
  -u "${DB_USER}" \
  "${DB_NAME}" <<'SQL'
SELECT
  VERSION() AS version,
  NOW() AS server_now,
  @@session.time_zone AS session_timezone,
  @@character_set_database AS database_charset,
  @@collation_database AS database_collation;

DROP TABLE IF EXISTS p1_connection_test;
CREATE TABLE p1_connection_test (
  id BIGINT PRIMARY KEY,
  chinese_text VARCHAR(64),
  payload JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

START TRANSACTION;
INSERT INTO p1_connection_test
VALUES (1, '平乡数据链路验证', JSON_OBJECT('status', '正常'));
SELECT
  id,
  chinese_text,
  JSON_UNQUOTE(JSON_EXTRACT(payload, '$.status')) AS json_status
FROM p1_connection_test;
ROLLBACK;

SELECT COUNT(*) AS rows_after_rollback FROM p1_connection_test;
DROP TABLE p1_connection_test;
SQL

echo "[verify:rds] connection, utf8mb4, JSON and transaction checks passed"
