#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-/root/.config/anxun/rds-emergency.env}"
RUNTIME_ACCOUNT="${RUNTIME_ACCOUNT:-anxun_runtime}"
DATABASE_GRANT_SCOPE="${DATABASE_GRANT_SCOPE:-anxun\\_platform}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[db:permissions] emergency environment file missing: ${ENV_FILE}" >&2
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
  -u "${DB_USER}" <<SQL
REVOKE DELETE, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, SHOW VIEW, EVENT, TRIGGER
ON \`${DATABASE_GRANT_SCOPE}\`.* FROM '${RUNTIME_ACCOUNT}'@'%';
SHOW GRANTS FOR '${RUNTIME_ACCOUNT}'@'%';
SQL

echo "[db:permissions] runtime database privileges reduced to SELECT, INSERT and UPDATE"
