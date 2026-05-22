# Imagem Firebird 2.5.9 SuperClassic do TronFire

Para evitar problemas com repositorios antigos, esta imagem nao usa `apt install firebird2.5`.

Antes do build, baixe os artefatos privados com:

```bash
bash scripts/install-assets.sh
```

O script coloca nesta pasta:

```txt
FirebirdCS-2.5.9.27139-0.amd64.tar.gz
template.fdb
```

O build falha se `gbak`, `gfix`, `gstat` ou `isql` nao existirem em `/usr/local/firebird/bin`.
