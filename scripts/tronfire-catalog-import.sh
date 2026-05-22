#!/usr/bin/env bash
set -euo pipefail

POSTGRES_CONTAINER="${TRONFIRE_POSTGRES_CONTAINER:-tronfire_postgres}"
POSTGRES_DB="${TRONFIRE_POSTGRES_DB:-tronfire}"
POSTGRES_USER="${TRONFIRE_POSTGRES_USER:-tronfire}"
DUMP_FILE="${1:-${TRONFIRE_CATALOG_DUMP:-/opt/tronsoftos/state/tronfire-catalog/tronfire_catalog_latest.dump}}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump nao encontrado: $DUMP_FILE" >&2
  exit 66
fi

cat "$DUMP_FILE" | docker exec -i "$POSTGRES_CONTAINER" pg_restore \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner
