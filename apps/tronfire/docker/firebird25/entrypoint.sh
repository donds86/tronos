#!/usr/bin/env bash
set -euo pipefail

# Garante caminho padrão mesmo se o pacote oficial tiver instalado em /opt/firebird.
if [ ! -x /usr/local/firebird/bin/gbak ]; then
  FB_GBAK="$(find /opt /usr/local -type f -name gbak 2>/dev/null | head -n 1 || true)"
  if [ -n "$FB_GBAK" ]; then
    FB_HOME_REAL="$(dirname "$(dirname "$FB_GBAK")")"
    rm -rf /usr/local/firebird
    ln -s "$FB_HOME_REAL" /usr/local/firebird
  fi
fi

mkdir -p /firebird/data /firebird/backups /firebird/uploads /firebird/templates /firebird/standby /firebird/restore-work /firebird/quarantine /firebird/logs /firebird/scripts

# Validação rígida dos utilitários.
test -x /usr/local/firebird/bin/gbak
test -x /usr/local/firebird/bin/gfix
test -x /usr/local/firebird/bin/gstat
test -x /usr/local/firebird/bin/isql
test -x /usr/local/firebird/bin/fbguard

DESIRED_PASSWORD="${FIREBIRD_PASSWORD:-${ISC_PASSWORD:-masterkey}}"
PASSWORD_FILE="/usr/local/firebird/SYSDBA.password"
CURRENT_PASSWORD="masterkey"

if [ -f "$PASSWORD_FILE" ]; then
  CURRENT_PASSWORD="$(awk -F= '/^ISC_PASSWD=/{print $2; exit}' "$PASSWORD_FILE")"
  CURRENT_PASSWORD="${CURRENT_PASSWORD:-masterkey}"
fi

if [ "$CURRENT_PASSWORD" != "$DESIRED_PASSWORD" ]; then
  /usr/local/firebird/bin/gsec -user sysdba -password "$CURRENT_PASSWORD" -mo sysdba -pw "$DESIRED_PASSWORD" \
    || /usr/local/firebird/bin/gsec -user sysdba -password "$DESIRED_PASSWORD" -mo sysdba -pw "$DESIRED_PASSWORD"
  {
    echo "# Firebird password managed by TronFire"
    echo "ISC_USER=sysdba"
    echo "ISC_PASSWD=$DESIRED_PASSWORD"
  } > "$PASSWORD_FILE"
  chmod 600 "$PASSWORD_FILE"
fi

DEFAULT_DB="${TRONFIRE_DEFAULT_DB:-/firebird/templates/template.fdb}"
if [ ! -f "$DEFAULT_DB" ] && [ -f /opt/tronfire/template.fdb ]; then
  cp /opt/tronfire/template.fdb "$DEFAULT_DB"
fi
if [ ! -f "$DEFAULT_DB" ]; then
  /usr/local/firebird/bin/isql -user SYSDBA -password "$DESIRED_PASSWORD" <<SQL
CREATE DATABASE '$DEFAULT_DB' USER 'SYSDBA' PASSWORD '$DESIRED_PASSWORD' PAGE_SIZE 8192 DEFAULT CHARACTER SET WIN1252;
COMMIT;
SQL
fi

exec /usr/local/firebird/bin/fbguard -forever
