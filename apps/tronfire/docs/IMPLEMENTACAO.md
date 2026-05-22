# TronFire — resumo técnico da implementação

## Nome

- Projeto: TronFire
- Plataforma/servidor: tronsoftOS

## Decisões oficiais

- Firebird 2.5.9 SuperClassic.
- Utilitários obrigatórios: gbak, gfix, gstat, isql.
- Storage fora do app.
- Uma instalação por cliente.
- Vários bancos do mesmo cliente.
- Apenas um banco marcado como produção atual.
- Template único: `/firebird/templates/template.fdb`.
- Cloudflare/proxy gerenciado fora do TronFire, pelo tronsoftOS.

## Containers

- tronfire_firebird25
- tronfire_backend
- tronfire_worker
- tronfire_postgres
- tronfire_redis

## Tipos de banco

- PRODUCAO
- LEGADO_CONSULTA
- HOMOLOGACAO
- TEMPLATE
- RESTAURADO_TEMPORARIO
- ARQUIVADO
