#!/usr/bin/env python3
"""
Script de automação para migração e unificação de memórias locais para o Hindsight e OpenViking (Projeto V7M).
Nó Central: 10.0.1.99
"""

import os
import sys
import glob
import json
import urllib.request
import urllib.error
from datetime import datetime

HINDSIGHT_URL = os.getenv("HINDSIGHT_URL", "http://10.0.1.99:8888")
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "v7m")
OPENVIKING_URL = os.getenv("OPENVIKING_URL", "http://10.0.1.99:1933")
OPENVIKING_TOKEN = os.getenv(
    "OPENVIKING_API_KEY",
    "ZGVmYXVsdA.YWRtaW4.MWRiNTkxYjExNWFiOGRkYzNhMGY3ZjEyZjk3ZDk0M2IwY2Q3ZDA4MjA1YmJmNTIwMzUxNGY1MTc3MzU1OTFkMw"
)

TARGET_LOCAL_FILES = [
    "MEMORY.md",
    ".cursorrules",
    "CLAUDE.md",
    "AGENTS.md",
    "SOUL.md",
    "IDENTITY.md",
]


def post_json(url: str, payload: dict, headers: dict = None) -> dict:
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[ERRO HTTP {e.code}] {url}: {body}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"[ERRO Conexão] {url}: {e}", file=sys.stderr)
        raise


def retain_hindsight(content: str, context: str):
    url = f"{HINDSIGHT_URL}/banks/{HINDSIGHT_BANK_ID}/memories"
    payload = {
        "content": content,
        "context": context,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    return post_json(url, payload)


def write_openviking(uri: str, content: str):
    url = f"{OPENVIKING_URL}/api/v1/content/write"
    headers = {"Authorization": f"Bearer {OPENVIKING_TOKEN}"}
    payload = {
        "uri": uri,
        "content": content,
        "mode": "replace",
        "wait": True
    }
    return post_json(url, payload, headers=headers)


def recall_hindsight(query: str):
    url = f"{HINDSIGHT_URL}/banks/{HINDSIGHT_BANK_ID}/recall"
    payload = {"query": query}
    return post_json(url, payload)


def search_openviking(query: str):
    url = f"{OPENVIKING_URL}/api/v1/search/search"
    headers = {"Authorization": f"Bearer {OPENVIKING_TOKEN}"}
    payload = {
        "query": query,
        "mode": "list",
        "read_content": True,
        "limit": 5
    }
    return post_json(url, payload, headers=headers)


def sweep_and_migrate(project_root: str = "."):
    print(f"=== [ETAPA 1] Varredura no diretório: {os.path.abspath(project_root)} ===")
    found_files = []
    for filename in TARGET_LOCAL_FILES:
        filepath = os.path.join(project_root, filename)
        if os.path.isfile(filepath):
            found_files.append(filepath)

    if not found_files:
        print("Nenhum arquivo padrão de memória local encontrado no diretório atual.")
    else:
        print(f"Arquivos identificados: {found_files}")

    for filepath in found_files:
        basename = os.path.basename(filepath)
        print(f"\n--- Processando {basename} ---")
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read().strip()

        if not content:
            continue

        # Classificação básica de contexto
        context = "preferences"
        if "architecture" in content.lower() or "django" in content.lower() or "ninja" in content.lower():
            context = "architecture"
        elif "incident" in content.lower() or "bug" in content.lower() or "release" in content.lower():
            context = "events"

        # 1. Ingestão Hindsight
        print(f"-> Ingerindo no Hindsight (bank={HINDSIGHT_BANK_ID}, context={context})...")
        try:
            retain_hindsight(content=content, context=context)
            print("   [OK] Hindsight gravado.")
        except Exception as e:
            print(f"   [AVISO] Falha ao enviar para Hindsight: {e}")

        # 2. Ingestão OpenViking
        viking_category = "preferences" if context == "preferences" else ("patterns" if context == "architecture" else "events")
        uri = f"viking://user/admin/memories/{viking_category}/{basename}"
        print(f"-> Ingerindo no OpenViking ({uri})...")
        try:
            write_openviking(uri=uri, content=content)
            print("   [OK] OpenViking gravado.")
        except Exception as e:
            print(f"   [AVISO] Falha ao enviar para OpenViking: {e}")

    print("\n=== [ETAPA 4] Executando Testes de Validação (Round-Trip) ===")
    try:
        res_hs = recall_hindsight("Quais são as diretrizes de desenvolvimento do projeto V7M?")
        print("-> Recall Hindsight executado com sucesso.")
    except Exception as e:
        print(f"-> Teste Hindsight com erro: {e}")

    try:
        res_ov = search_openviking("V7M")
        print("-> Search OpenViking executado com sucesso.")
    except Exception as e:
        print(f"-> Teste OpenViking com erro: {e}")

    print("\n=== Fim do Processo de Migração ===")


if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    sweep_and_migrate(target_dir)
