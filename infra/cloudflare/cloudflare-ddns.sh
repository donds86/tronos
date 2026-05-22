#!/usr/bin/env bash
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?missing CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ZONE_ID:?missing CLOUDFLARE_ZONE_ID}"
: "${CLOUDFLARE_RECORD_ID:?missing CLOUDFLARE_RECORD_ID}"
: "${CLOUDFLARE_RECORD_NAME:?missing CLOUDFLARE_RECORD_NAME}"
: "${CLOUDFLARE_TARGET_IP:?missing CLOUDFLARE_TARGET_IP}"

RECORD_TYPE="${CLOUDFLARE_RECORD_TYPE:-A}"
PROXIED="${CLOUDFLARE_PROXIED:-true}"

curl -fsS -X PUT \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${CLOUDFLARE_RECORD_ID}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"${RECORD_TYPE}\",\"name\":\"${CLOUDFLARE_RECORD_NAME}\",\"content\":\"${CLOUDFLARE_TARGET_IP}\",\"ttl\":60,\"proxied\":${PROXIED}}"
