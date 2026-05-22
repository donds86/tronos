FROM docker:27-cli AS docker-cli

FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY worker/package*.json ./
RUN npm install
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY worker/src ./src
CMD ["node", "src/worker.js"]
