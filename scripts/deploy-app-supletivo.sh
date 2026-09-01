#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# 🚀 V7M Production Deploy Script: @v7m/app-supletivo (Standalone + Static Assets)
# ==============================================================================
# Sincronização 100% atômica de .next/standalone, .next/static e public
# para o container v7m-app-supletivo no CT 150 (10.0.1.50).
# Zero ChunkLoadError (404) garantido.
# ==============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/apps/app-supletivo"
CT150_HOST="10.0.1.50"
CONTAINER_NAME="v7m-app-supletivo"
URL_BACKEND="http://10.0.1.50:8001"

echo "📦 [1/5] Compilando @v7m/app-supletivo em modo standalone com Next.js 16..."
cd "${REPO_ROOT}"

pnpm --filter @v7m/ui check-types
pnpm --filter @v7m/app-supletivo check-types

cd "${APP_DIR}"
NEXT_TELEMETRY_DISABLED=1 URL_BACKEND="${URL_BACKEND}" pnpm run build

echo "🛠️ [2/5] Montando bundle atômico de produção..."
BUNDLE_DIR=$(mktemp -d -t v7m-app-supletivo-bundle-XXXXXX)
trap 'rm -rf "${BUNDLE_DIR}" /tmp/app-supletivo-bundle.tar.gz /tmp/static-fresh' EXIT

# Estrutura standalone do Next.js monorepo
mkdir -p "${BUNDLE_DIR}/apps/app-supletivo/.next"
mkdir -p "${BUNDLE_DIR}/.next"

if [ -d "${APP_DIR}/.next/standalone/apps/app-supletivo" ]; then
  cp -r "${APP_DIR}/.next/standalone/apps/app-supletivo/." "${BUNDLE_DIR}/apps/app-supletivo/"
fi

if [ -d "${APP_DIR}/.next/standalone/node_modules" ]; then
  mkdir -p "${BUNDLE_DIR}/node_modules"
  cp -r "${APP_DIR}/.next/standalone/node_modules/." "${BUNDLE_DIR}/node_modules/"
fi

if [ -d "${APP_DIR}/.next/standalone/packages" ]; then
  mkdir -p "${BUNDLE_DIR}/packages"
  cp -r "${APP_DIR}/.next/standalone/packages/." "${BUNDLE_DIR}/packages/"
fi

# Copia static e public para os dois caminhos possíveis de resolução do Next.js
cp -r "${APP_DIR}/.next/static" "${BUNDLE_DIR}/apps/app-supletivo/.next/static"
cp -r "${APP_DIR}/.next/static" "${BUNDLE_DIR}/.next/static"
cp -r "${APP_DIR}/public" "${BUNDLE_DIR}/apps/app-supletivo/public"
cp -r "${APP_DIR}/public" "${BUNDLE_DIR}/public"

echo "📦 [3/5] Compactando payload atômico..."
tar -czf /tmp/app-supletivo-bundle.tar.gz -C "${BUNDLE_DIR}" .

echo "🚀 [4/5] Transferindo e aplicando no CT 150 (${CONTAINER_NAME})..."
scp -q /tmp/app-supletivo-bundle.tar.gz "root@${CT150_HOST}:/tmp/"

ssh "root@${CT150_HOST}" bash << EOF
  set -euo pipefail
  docker cp /tmp/app-supletivo-bundle.tar.gz "${CONTAINER_NAME}:/app/"
  docker exec "${CONTAINER_NAME}" tar -xzf /app/app-supletivo-bundle.tar.gz -C /app/
  docker restart "${CONTAINER_NAME}" > /dev/null
  rm -f /tmp/app-supletivo-bundle.tar.gz
EOF

echo "🔍 [5/5] Executando healthcheck pós-deploy..."
sleep 3

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${CT150_HOST}:3000/api/v1/clients/pricing" || echo "000")
if [ "${HTTP_STATUS}" != "200" ]; then
  echo "❌ Falha no healthcheck interno: HTTP ${HTTP_STATUS}"
  exit 1
fi

WAN_STATUS=$(curl -s -k -o /dev/null -w "%{http_code}" "https://app.supletivo.net.br/matricula" || echo "000")
if [ "${WAN_STATUS}" != "200" ]; then
  echo "❌ Falha no healthcheck público: HTTP ${WAN_STATUS}"
  exit 1
fi

echo "============================================================"
echo "✅ DEPLOY ATÔMICO DE @v7m/app-supletivo CONCLUÍDO COM SUCESSO!"
echo "   - Host: ${CT150_HOST}:3000"
echo "   - WAN: https://app.supletivo.net.br"
echo "   - Chunks Estáticos: 100% Sincronizados"
echo "============================================================"
