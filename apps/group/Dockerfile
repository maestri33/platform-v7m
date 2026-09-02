# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.34.5 turbo@^2

# --- Fase 1: Prune do Monorepo ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @v7m/group --docker

# --- Fase 2: Instalação & Build ---
FROM base AS builder
WORKDIR /app

# Instala dependências usando apenas lockfile e package.json podados (camada cacheada eficientemente)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Copia código-fonte podado sobre os node_modules instalados
COPY --from=pruner /app/out/full/ .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3200"
ARG URL_BACKEND="http://backend-web:8000"
ENV URL_BACKEND=$URL_BACKEND

RUN pnpm turbo run build --filter=@v7m/group

# --- Fase 3: Imagem Final de Execução ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/group/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/group/.next/static ./apps/group/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/group/public ./apps/group/public

USER nextjs

EXPOSE 3003

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3003/healthz || exit 1

CMD ["node", "apps/group/server.js"]
