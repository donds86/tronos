# Contrato TronSoftOS + TronFire HA

## Responsabilidades

O TronSoftOS orquestra o cluster:

- define se a instalacao e `simple` ou `ha`;
- define o papel do no: `primary`, `standby` ou `recovery`;
- instala/configura Firebird 2.5.9 no host quando aplicavel;
- instala/configura `rclone` no Debian/host;
- configura e controla `keepalived`;
- sincroniza backups Firebird, manifestos e catalogo PostgreSQL do TronFire;
- envia backups validados para nuvem usando `rclone`;
- grava `/opt/tronsoftos/state/cluster-lock.json`;
- chama endpoints internos do TronFire com token.

O TronFire opera o Firebird:

- executa `gbak`, `gfix`, `gstat` e `isql`;
- gera backup e manifesto por banco;
- restaura backups recebidos em `/firebird/standby`;
- valida banco standby por alias;
- informa status de producao e standby;
- promove standby somente quando autorizado pelo TronSoftOS.

## Modos

```env
TRONFIRE_DEPLOYMENT_MODE=simple|ha
TRONFIRE_NODE_ROLE=primary|standby|recovery
FIREBIRD_EXEC_MODE=container|host
TRONSOFTOS_EXTERNAL_BACKUP_OWNER=true|false
```

No modo `simple`, o TronFire trabalha como hoje. No modo `ha`, operacoes que alteram producao sao bloqueadas quando o no nao e `primary`.

Quando `FIREBIRD_EXEC_MODE=host`, os containers `backend` e `worker` continuam existindo, mas o TronSoftOS deve montar no container os paths `/firebird/...` e os utilitarios Firebird 2.5.9 esperados por `FIREBIRD_BIN`. O TronFire executa os comandos diretamente no ambiente do container, sem `docker exec tronfire_firebird25`.

Quando `TRONSOFTOS_EXTERNAL_BACKUP_OWNER=true`, o TronFire nao deve enviar backups para Google Drive ou outro destino externo. Ele gera o backup local, valida, cria manifesto e deixa o upload externo para o TronSoftOS.

## Bancos

Cada banco gerenciado tem caminho de producao e caminho de standby:

```text
Producao: /firebird/data/erp_tronsoft.fdb
Standby:  /firebird/standby/erp_tronsoft_standby.fdb
```

O restore automatico de HA nunca sobrescreve producao. Ele restaura em `standbyPath`, valida, e marca o banco como `READY`.

## Manifesto De Backup

Cada backup gerado pelo TronFire cria um manifesto:

```json
{
  "databaseAlias": "erp_tronsoft",
  "sourceNode": "servidor-01",
  "backupPath": "/firebird/backups/erp_tronsoft_20260521153400.gbk.gz",
  "backupSha256": "...",
  "backupFinishedAt": "2026-05-21T15:34:00-03:00",
  "productionPath": "/firebird/data/erp_tronsoft.fdb",
  "standbyPath": "/firebird/standby/erp_tronsoft_standby.fdb"
}
```

O TronSoftOS sincroniza o `.gbk.gz` e o `.manifest.json` para o no standby.

## Backup Externo Com Rclone

O `rclone` e um programa instalado no Debian/host, nao dentro dos containers do TronFire.

Arquivos sugeridos:

```text
/opt/tronsoftos/config/rclone/rclone.conf
/opt/tronsoftos/state/backup-cloud/
/opt/tronsoftos/logs/rclone/
```

Fluxo:

```text
TronFire gera backup local e manifesto
      |
TronSoftOS detecta backup validado
      |
TronSoftOS executa rclone copy/sync
      |
TronSoftOS registra sucesso/falha
      |
TronSoftOS envia alerta se necessario
```

Em HA, somente o no `primary` deve enviar backups para nuvem. O no `standby` recebe backups, restaura em `/firebird/standby` e valida.

## Endpoints Internos

Todos os endpoints de alteracao HA exigem `X-TronSoftOS-Token`.

```text
GET  /api/ha/status
POST /api/ha/standby/restore
POST /api/ha/standby/validate
POST /api/ha/standby/promote
```

Promocao exige:

- no em `standby` ou `recovery`;
- `TRONFIRE_DEPLOYMENT_MODE=ha`;
- `cluster-lock.json` com `allow_promotion=true`;
- token interno valido;
- confirmacao `PROMOTE_STANDBY`;
- todos os bancos obrigatorios com standby `READY`.

## Retorno Do No Antigo

Um no que voltou depois de failover entra como `recovery` ou `standby`. Ele nao reassume como principal sozinho. O TronSoftOS compara o estado do cluster e so permite failback planejado.
