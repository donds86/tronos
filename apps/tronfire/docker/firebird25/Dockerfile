FROM debian:bullseye-slim

ENV FIREBIRD_HOME=/usr/local/firebird
ENV PATH="/usr/local/firebird/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libstdc++6 \
    libncurses5 \
    libtommath1 \
    procps \
    net-tools \
    bash \
    unzip \
    zip \
    xz-utils \
    findutils \
    && rm -rf /var/lib/apt/lists/*

# O instalador antigo do Firebird tenta consultar esses arquivos em algumas distros minimalistas.
# Se eles não existem, aparecem warnings de grep. Criamos vazios para evitar ruído no build.
RUN touch /etc/services /etc/inetd.conf

# IMPORTANTE:
# Para evitar dependência de repositórios antigos, coloque o pacote oficial FirebirdCS 2.5.9 nesta pasta antes do build:
# docker/firebird25/FirebirdCS-2.5.9.27139-0.amd64.tar.gz
# docker/firebird25/template.fdb
COPY FirebirdCS-2.5.9.27139-0.amd64.tar.gz /tmp/firebird.tar.gz

RUN mkdir -p /tmp/firebird-install \
    && tar -xzf /tmp/firebird.tar.gz -C /tmp/firebird-install --strip-components=1 \
    && cd /tmp/firebird-install \
    && ./install.sh -silent \
    && rm -rf /tmp/firebird-install /tmp/firebird.tar.gz

# Normaliza o caminho dos binários.
# Alguns pacotes Firebird 2.5 instalam em /opt/firebird, não em /usr/local/firebird.
# O TronFire padroniza /usr/local/firebird para backend/worker/preflight.
RUN set -eux; \
    FB_GBAK="$(find /opt /usr/local -type f -name gbak 2>/dev/null | head -n 1)"; \
    test -n "$FB_GBAK"; \
    FB_BIN="$(dirname "$FB_GBAK")"; \
    FB_HOME_REAL="$(dirname "$FB_BIN")"; \
    echo "Firebird detectado em: $FB_HOME_REAL"; \
    if [ "$FB_HOME_REAL" != "/usr/local/firebird" ]; then \
      rm -rf /usr/local/firebird; \
      ln -s "$FB_HOME_REAL" /usr/local/firebird; \
    fi; \
    mkdir -p \
      /firebird/data \
      /firebird/backups \
      /firebird/uploads \
      /firebird/templates \
      /firebird/standby \
      /firebird/restore-work \
      /firebird/quarantine \
      /firebird/logs \
      /firebird/scripts; \
    ln -sf /usr/local/firebird/bin/gbak /usr/bin/gbak; \
    ln -sf /usr/local/firebird/bin/gfix /usr/bin/gfix; \
    ln -sf /usr/local/firebird/bin/gstat /usr/bin/gstat; \
    ln -sf /usr/local/firebird/bin/isql /usr/bin/isql; \
    test -x /usr/local/firebird/bin/gbak; \
    test -x /usr/local/firebird/bin/gfix; \
    test -x /usr/local/firebird/bin/gstat; \
    test -x /usr/local/firebird/bin/isql; \
    test -x /usr/local/firebird/bin/fbguard

COPY entrypoint.sh /entrypoint.sh
COPY template.fdb /opt/tronfire/template.fdb
RUN chmod +x /entrypoint.sh

EXPOSE 3050
ENTRYPOINT ["/entrypoint.sh"]
