#!/usr/bin/env sh
set -eu

APP_DIR="${1:-/opt/anxun-mid-platform-vite}"
BACKUP_DIR="${2:-/opt/backups/anxun-mid-platform-vite/jsonl}"
RETENTION_DAYS="${JSONL_BACKUP_RETENTION_DAYS:-30}"
SOURCE="${APP_DIR}/.data/caoliao-business-events.jsonl"

if [ ! -f "${SOURCE}" ]; then
  echo "[backup:jsonl] source missing: ${SOURCE}" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
timestamp="$(date +%Y%m%d-%H%M%S)"
destination="${BACKUP_DIR}/caoliao-business-events-${timestamp}.jsonl.gz"
gzip -c "${SOURCE}" > "${destination}"
chmod 600 "${destination}"
sha256sum "${destination}" > "${destination}.sha256"
chmod 600 "${destination}.sha256"
find "${BACKUP_DIR}" -type f -name 'caoliao-business-events-*.jsonl.gz*' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup:jsonl] created ${destination}"
