#!/usr/bin/env bash
set -euo pipefail

RCLONE_BIN="${RCLONE_BIN:-/usr/bin/rclone}"
RCLONE_CONFIG="${RCLONE_CONFIG:-/opt/tronsoftos/config/rclone/rclone.conf}"
RCLONE_REMOTE="${RCLONE_REMOTE:?missing RCLONE_REMOTE}"
RCLONE_BACKUP_PATH="${RCLONE_BACKUP_PATH:-tronsoftos/backups}"
FIREBIRD_BACKUP_DIR="${FIREBIRD_BACKUP_DIR:-/opt/tronfire-storage/firebird/backups}"
NODE_ROLE="${TRONFIRE_NODE_ROLE:-${TRONSOFTOS_NODE_ROLE:-primary}}"
UPLOAD_ONLY_ROLE="${RCLONE_UPLOAD_ONLY_ROLE:-primary}"
LOG_DIR="${TRONSOFTOS_LOG_DIR:-/opt/tronsoftos/logs}/rclone"

if [ "$NODE_ROLE" != "$UPLOAD_ONLY_ROLE" ]; then
  echo "rclone upload ignorado: role atual $NODE_ROLE, role exigido $UPLOAD_ONLY_ROLE"
  exit 0
fi

mkdir -p "$LOG_DIR"

"$RCLONE_BIN" copy "$FIREBIRD_BACKUP_DIR" "${RCLONE_REMOTE}:${RCLONE_BACKUP_PATH}" \
  --config "$RCLONE_CONFIG" \
  --include "*.gbk" \
  --include "*.fbk" \
  --include "*.gbk.gz" \
  --include "*.fbk.gz" \
  --include "*.manifest.json" \
  --exclude "*" \
  --log-file "$LOG_DIR/upload.log" \
  --log-level INFO
