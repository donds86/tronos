#!/usr/bin/env bash
set -euo pipefail

RUNTIME="${CONTAINER_RUNTIME:-docker}"
TRONFIRE_CONTAINER="${TRONFIRE_CONTAINER:-tronfire}"
TRONCOMANDA_CONTAINER="${TRONCOMANDA_CONTAINER:-troncomanda}"

usage() {
  echo "usage: $0 {status|start|stop|restart|logs} [tronfire|troncomanda]"
}

container_name() {
  case "${1:-}" in
    tronfire) echo "$TRONFIRE_CONTAINER" ;;
    troncomanda) echo "$TRONCOMANDA_CONTAINER" ;;
    *) return 1 ;;
  esac
}

action="${1:-}"
target="${2:-}"

case "$action" in
  status)
    "$RUNTIME" ps --filter "name=${TRONFIRE_CONTAINER}" --filter "name=${TRONCOMANDA_CONTAINER}"
    ;;
  start|stop|restart)
    if [[ -n "$target" ]]; then
      "$RUNTIME" "$action" "$(container_name "$target")"
    else
      "$RUNTIME" "$action" "$TRONFIRE_CONTAINER" "$TRONCOMANDA_CONTAINER"
    fi
    ;;
  logs)
    if [[ -z "$target" ]]; then
      usage
      exit 2
    fi
    "$RUNTIME" logs --tail 200 -f "$(container_name "$target")"
    ;;
  *)
    usage
    exit 2
    ;;
esac
