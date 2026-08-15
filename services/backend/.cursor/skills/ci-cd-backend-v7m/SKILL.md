---
name: ci-cd-backend-v7m
description: >
  Acompanha o CD do backend-supletivo no host backend-v7m (CT 30101) até o deploy
  em produção concluir, ligando um loop de 1 min que vigia o workflow Deploy pelo
  GitHub Actions; ao terminar com sucesso, gera o handoff de APIs pro frontend. Use
  quando o usuário pedir /ci-cd-backend-v7m, "acompanhar o deploy", "garantir que o
  CD aconteceu", "vigiar o deploy até subir", ou "me devolve o handoff quando subir".
---

# CI/CD backend-v7m — vigia o deploy até subir e devolve o handoff

Automatiza o ciclo: **merge na `main` → CI na main → Deploy (CD) em produção → handoff pro frontend**.

## Contexto fixo do projeto

- Repo: `maestri33/backend-supletivo`. Grupos Ninja em `/api/v1/<grupo>/` (`clients`, `collaborators`, `leadership`, `staff`, `tools`).
- **CD = workflow `deploy.yml`** (`.github/workflows/deploy.yml`). Dispara em `workflow_run` do **CI concluído com sucesso na `main`**. O runner **self-hosted CT 30101 (`backend-v7m`, 10.1.30.101)** faz `git reset --hard` pro SHA validado, `uv sync`, `manage.py check`, `migrate`, `collectstatic`, `systemctl restart backend-web backend-qcluster` e prova o health em `http://127.0.0.1:8000/api/v1/clients/health`. Em falha: rollback de código + abre issue `deploy-failure`.
- **NÃO tente SSH em 10.1.30.101** de um ambiente na nuvem — é IP de LAN privada, não roteia (só sai HTTPS). Verifique tudo pelo **GitHub Actions API**. (Se estiver rodando na LAN do usuário e o SSH responder, aí sim dá pra checar `git -C /opt/backend-supletivo rev-parse HEAD` + `systemctl is-active` + o health no loopback.)

## Pré-condição

O CD só roda depois do **merge na `main`**. Antes de ligar o loop:
1. Descubra o `head.sha` da `main` **antes** do merge que você quer deployar — esse é o **SHA base** (o deploy que já existe). Use `mcp__github__pull_request_read get` no PR ou `list_commits` da main.
2. Se a mudança ainda está num PR **draft/não-mergeado**, o CD não pode acontecer. Isso é uma decisão do usuário (deploy em PRODUÇÃO): pergunte com `AskUserQuestion` se ele mesmo vai mergear, se autoriza você a mergear, ou se só quer confirmar o estado atual. Só ligue o loop depois que o merge estiver garantido (por ele ou por você).
   - Se autorizado a mergear um draft: `update_pull_request draft:false` → `merge_pull_request merge_method:merge`. Guarde o **SHA do merge** (é o que vai ser deployado).

## Ligar o loop (1 min)

`CronCreate` com `cron: "*/1 * * * *"`, `recurring: true`, e um prompt auto-contido que re-executa a verificação (abaixo). Guarde o **id do job** pra cancelar. Confirme ao usuário: job id, cadência, que expira sozinho em 7 dias, e como cancelar (`CronDelete`). **Rode a 1ª verificação na hora**, sem esperar o 1º tick.

## Verificação a cada tick

1. `mcp__github__actions_list list_workflow_runs` de `deploy.yml` (per_page 3) em `maestri33/backend-supletivo`.
2. O output costuma **estourar o limite de tokens** — ele é salvo num arquivo; parseie via python o run mais recente:
   ```bash
   python3 -c "import json,sys; d=json.load(open(sys.argv[1])); r=(d.get('workflow_runs') or [])[0]; print(r['id'],(r['head_sha'] or '')[:7],r['status'],r['conclusion'])" <arquivo-salvo>
   ```
3. Decida pelo run mais recente:
   - **`head_sha == SHA base`** (ou PR ainda não mergeado): CD ainda não começou → **reporte 1 linha de status e aguarde** o próximo tick.
   - **`head_sha != SHA base` e `status != completed`** (queued/in_progress): deploy rodando → **1 linha de status, aguarde**.
   - **`head_sha != SHA base` e `completed`+`success`**: ✅ **CD ACONTECEU** → `CronDelete` o job, confirme o SHA deployado ao usuário, e **gere o handoff** (abaixo).
   - **`completed`+`failure`**: ❌ pare o loop (`CronDelete`), pegue o log com `mcp__github__get_job_logs` (job do run, `return_content:true`, `tail_lines`), reporte a falha ao usuário e **NÃO** gere o handoff (o rollback de código já roda sozinho no runner; migração de schema NÃO volta — avise).

## Handoff pro frontend (ao concluir com sucesso)

Escreva um markdown **detalhado** cobrindo **todas** as mudanças de API que subiram (diff do que foi mergeado). Para cada endpoint: **método + path completo `/api/v1/<grupo>/...`**, auth exigida, request (schema/campos/multipart), response (JSON de exemplo), **códigos de erro** (`{detail, code, ...extra}`), e **notas de migração pro front**. Feche com um checklist de migração.

Fontes de verdade pros schemas: `api/<grupo>.py` (schemas `Xxx(Schema)` + rotas), e `openapi.json` de cada grupo. Entregue o arquivo com `SendUserFile` (grave num scratchpad **fora** da árvore do repo pra não sujar o git — o repo tem um stop-hook que reclama de arquivo não rastreado).

## Encerramento

Só termine quando: (a) CD success → handoff entregue, ou (b) CD failure → falha reportada, ou (c) o usuário mandar parar. Em qualquer caso, garanta que o job do `CronCreate` foi cancelado (`CronDelete`).
