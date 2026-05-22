#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="${APP_ROOT:-/opt/tronsoftOS/apps/tronfire/app}"
STORAGE_ROOT="${STORAGE_ROOT:-/opt/tronsoftOS/storage/tronfire}"
echo "Validando TronFire antes de atualizar..."
[ -n "$STORAGE_ROOT" ] || { echo "ERRO: STORAGE_ROOT vazio"; exit 1; }
[ -d "$STORAGE_ROOT" ] || { echo "ERRO: STORAGE_ROOT não existe: $STORAGE_ROOT"; exit 1; }
[ -d "$STORAGE_ROOT/firebird/data" ] || { echo "ERRO: pasta firebird/data não existe"; exit 1; }
case "$STORAGE_ROOT" in "$APP_ROOT"/*) echo "ERRO: STORAGE_ROOT não pode ficar dentro de APP_ROOT"; exit 1;; esac
[ "$STORAGE_ROOT" != "$APP_ROOT" ] || { echo "ERRO: STORAGE_ROOT não pode ser igual a APP_ROOT"; exit 1; }
FREE_KB=$(df "$STORAGE_ROOT" | awk 'NR==2 {print $4}')
[ "$FREE_KB" -gt 1048576 ] || { echo "ERRO: espaço livre menor que 1GB"; exit 1; }
echo "Pré-validação OK."
