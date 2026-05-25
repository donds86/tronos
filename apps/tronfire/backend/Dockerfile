FROM docker:27-cli AS docker-cli

FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openssl ca-certificates bash procps net-tools xz-utils findutils \
    libstdc++6 libtommath1 libncurses6 libtinfo6 \
  && ln -sf /lib/x86_64-linux-gnu/libncurses.so.6 /lib/x86_64-linux-gnu/libncurses.so.5 \
  && ln -sf /lib/x86_64-linux-gnu/libtinfo.so.6 /lib/x86_64-linux-gnu/libtinfo.so.5 \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm install
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/src ./src
COPY frontend ./frontend
EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
