#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-/etc/anxun-mid-platform.env}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[verify:runtime] environment file missing: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

export MYSQL_PWD="${DB_PASSWORD}"
trap 'unset MYSQL_PWD' EXIT

mysql_base() {
  mysql \
    --connect-timeout=8 \
    --default-character-set=utf8mb4 \
    -h "${DB_HOST}" \
    -P "${DB_PORT:-3306}" \
    -u "${DB_USER}" \
    "${DB_NAME}" "$@"
}

mysql_base -e "SELECT COUNT(*) AS migration_count FROM schema_migrations;"
mysql_base -e "SHOW GRANTS;"

if mysql_base -e "CREATE TABLE p1_runtime_ddl_test (id INT);" >/dev/null 2>&1; then
  mysql_base -e "DROP TABLE IF EXISTS p1_runtime_ddl_test;" >/dev/null 2>&1 || true
  echo "[verify:runtime] runtime account unexpectedly has CREATE permission" >&2
  exit 1
fi

echo "[verify:runtime] read access passed and DDL access was denied as expected"
