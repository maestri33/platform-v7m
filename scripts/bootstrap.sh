#!/usr/bin/env bash
# ==============================================================================
# V7M ECOSYSTEM · BOOTSTRAP SCRIPT (Linux / macOS / WSL / CI)
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-v7m"

echo "======================================================"
echo " 🚀 V7M ECOSYSTEM · BOOTSTRAP INICIAL"
echo "======================================================"

# 1. Garantir existência do arquivo .env
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "✓ Criado .env na raiz"
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    elif [ -f "$BACKEND_DIR/.env.ci" ]; then
        cp "$BACKEND_DIR/.env.ci" "$BACKEND_DIR/.env"
    fi
    echo "✓ Criado backend-v7m/.env"
fi

# 2. Executar migrações e seed
echo ""
echo "--- EXECUTANDO MIGRAÇÕES E SEED DE DADOS ---"

if command -v uv >/dev/null 2>&1; then
    (cd "$BACKEND_DIR" && uv run python manage.py migrate --noinput && uv run python manage.py seed_defaults)
else
    (cd "$BACKEND_DIR" && python manage.py migrate --noinput && python manage.py seed_defaults)
fi

echo ""
echo "======================================================"
echo " ✅ BOOTSTRAP CONCLUÍDO COM SUCESSO!"
echo "======================================================"
