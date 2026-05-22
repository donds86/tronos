#!/usr/bin/env bash
set -euo pipefail

POSTGRES_CONTAINER="${TRONFIRE_POSTGRES_CONTAINER:-tronfire_postgres}"
POSTGRES_DB="${TRONFIRE_POSTGRES_DB:-tronfire}"
POSTGRES_USER="${TRONFIRE_POSTGRES_USER:-tronfire}"
OUT_DIR="${TRONFIRE_CATALOG_EXPORT_DIR:-/opt/tronsoftos/state/tronfire-catalog}"
STAMP="$(date +%Y%m%d%H%M%S)"
OUT_FILE="${OUT_DIR}/tronfire_catalog_${STAMP}.dump"
LATEST_FILE="${OUT_DIR}/tronfire_catalog_latest.dump"

mkdir -p "$OUT_DIR"
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT_FILE"
cp "$OUT_FILE" "$LATEST_FILE"
sha256sum "$OUT_FILE" > "${OUT_FILE}.sha256"
sha256sum "$LATEST_FILE" > "${LATEST_FILE}.sha256"

echo "$OUT_FILE"
