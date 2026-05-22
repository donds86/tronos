#!/usr/bin/env bash
set -euo pipefail
VERSION="${1:-}"
APP_ROOT="${APP_ROOT:-/opt/tronsoftOS/apps/tronfire/app}"
[ -n "$VERSION" ] || { echo "Uso: ./scripts/update-system.sh v0.1.0"; exit 1; }
cd "$APP_ROOT"
./scripts/pre-update-check.sh
./scripts/backup-config-before-update.sh
git fetch --tags
git checkout "$VERSION"
docker compose up -d --build
docker compose exec backend npm run preflight
echo "TronFire atualizado para $VERSION"
