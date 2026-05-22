#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${TRONSOFTOS_HEALTH_URL:-http://127.0.0.1:8080/health}"

curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null
