#!/usr/bin/env bash
set -euo pipefail

: "${FIREBIRD_DATA_DIR:=/var/lib/firebird/data}"
: "${FIREBIRD_BACKUP_DIR:=/opt/tronfire-storage/firebird/backups}"
: "${FIREBIRD_SYNC_MODE:=backups}"
: "${FIREBIRD_DB_PATTERN:=*.fdb}"
: "${FIREBIRD_RSYNC_TARGET:?missing FIREBIRD_RSYNC_TARGET}"

RSYNC_SSH_USER="${FIREBIRD_RSYNC_SSH_USER:-root}"
RSYNC_SSH_PORT="${FIREBIRD_RSYNC_SSH_PORT:-22}"
SSH_OPTS="ssh -p ${RSYNC_SSH_PORT}"

if [[ "${FIREBIRD_STOP_DURING_SYNC:-false}" == "true" ]]; then
  : "${FIREBIRD_SERVICE:=firebird}"
  sudo systemctl stop "$FIREBIRD_SERVICE"
  trap 'sudo systemctl start "$FIREBIRD_SERVICE"' EXIT
fi

if [[ "$FIREBIRD_SYNC_MODE" == "database-files" ]]; then
  rsync -aHAX --numeric-ids --delete \
    -e "$SSH_OPTS" \
    --include="$FIREBIRD_DB_PATTERN" \
    --include='*/' \
    --exclude='*' \
    "${FIREBIRD_DATA_DIR%/}/" \
    "${RSYNC_SSH_USER}@${FIREBIRD_RSYNC_TARGET}"
else
  rsync -aHAX --numeric-ids \
    -e "$SSH_OPTS" \
    --include='*.gbk' \
    --include='*.fbk' \
    --include='*.gbk.gz' \
    --include='*.fbk.gz' \
    --include='*.manifest.json' \
    --exclude='*' \
    "${FIREBIRD_BACKUP_DIR%/}/" \
    "${RSYNC_SSH_USER}@${FIREBIRD_RSYNC_TARGET}"
fi
