#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="${APP_ROOT:-/opt/tronsoftOS/apps/tronfire/app}"
STORAGE_ROOT="${STORAGE_ROOT:-/opt/tronsoftOS/storage/tronfire}"
STAMP=$(date +"%Y%m%d_%H%M%S")
DEST="$STORAGE_ROOT/update-backups/$STAMP"
mkdir -p "$DEST"
cp "$APP_ROOT/.env" "$DEST/.env" 2>/dev/null || true
cp "$APP_ROOT/docker-compose.yml" "$DEST/docker-compose.yml" 2>/dev/null || true
git -C "$APP_ROOT" rev-parse HEAD > "$DEST/git_commit.txt" 2>/dev/null || true
git -C "$APP_ROOT" describe --tags --always > "$DEST/git_version.txt" 2>/dev/null || true
docker compose -f "$APP_ROOT/docker-compose.yml" ps > "$DEST/docker_compose_ps.txt" 2>/dev/null || true
echo "Backup de configuração salvo em: $DEST"
