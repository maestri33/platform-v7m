#!/usr/bin/env bash
# ==============================================================================
# V7M Production Host (CT 150) Cleanup & Alignment Script
# ==============================================================================
# Executar este script dentro do container CT 150 (root@v7m-core) para:
# 1. Desligar e remover containers legados (pre-RFC 002 e pré-Cloudflare Pages)
# 2. Liberar memória RAM e recursos de CPU
# 3. Manter estritamente os 7 containers vitais de produção
# ==============================================================================

set -euo pipefail

echo "====================================================="
echo "🧹 V7M CT 150 Host Alignment & Cleanup"
echo "====================================================="

LEGACY_CONTAINERS=(
    "v7m-app-promotor"
    "v7m-hub"
    "v7m-landing-promotor"
    "v7m-landing-supletivo"
)

echo "Passo 1: Identificando e removendo containers legados..."
for container in "${LEGACY_CONTAINERS[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -Eq "^${container}\$"; then
        echo "🛑 Parando e removendo container obsoleto: ${container}"
        docker stop "${container}" 2>/dev/null || true
        docker rm "${container}" 2>/dev/null || true
    else
        echo "✓ Container já ausente: ${container}"
    fi
done

echo ""
echo "Passo 2: Status atual dos containers ativos no CT 150:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "====================================================="
echo "✅ Limpeza concluída com sucesso no CT 150!"
echo "====================================================="
