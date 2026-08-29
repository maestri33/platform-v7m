# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.34.5 turbo@^2

# --- Fase 1: Prune do Monorepo ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @v7m/app-supletivo --docker

# --- Fase 2: Instalação de Dependências ---
FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# --- Fase 3: Build da Aplicação ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3200"
ARG URL_BACKEND="http://backend-web:8000"
ENV URL_BACKEND=$URL_BACKEND

RUN pnpm turbo run build --filter=@v7m/app-supletivo

# --- Fase 4: Imagem Final de Execução ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/app-supletivo/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/app-supletivo/.next/static ./apps/app-supletivo/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/app-supletivo/public ./apps/app-supletivo/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "apps/app-supletivo/server.js"]
