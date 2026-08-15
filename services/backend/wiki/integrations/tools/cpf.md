# cpf — integrations/tools/cpf (CPFHub.io)

> **ESTADO:** tool de CPF (lookup CPFHub.io) — feita, testada com chamada REAL e **aprovada no
> Portão 3** (Victor 2026-06-01). Caminho do MVP §4 item 1 (subgrupo **tools**). Label do app: `cpf`.
> É **só o cliente** — quem persiste/expõe identidade é o app `users/profiles` (ainda não existe).

App Django que porta a integração **CPFHub.io** do micro legado (`~/coders/backend/profiles`, FastAPI)
pro monólito, como *tool* de apoio (CONVENTION §2/§8: `integrations/tools/<funcao>/scripts/`).
**CPFHub exige api-key** (header `x-api-key`, server-side only — §8); o app tem system check que
**avisa** (não trava) se a key faltar (`cpf.W001` — diferente do asaas/ia, que travam o `manage.py`).
Lookup é stateless → sem models/migração e sem endpoint HTTP (consumo é in-process, como o `cep`).

## O que faz

`integrations/tools/cpf/scripts/cpfhub.py` → `async def lookup(cpf) -> CpfIdentity | None`:

1. Limpa o CPF pra 11 dígitos. `len != 11` → **`None`** (nem chama a CPFHub — economiza chamada paga).
2. `GET {CPFHUB_BASE_URL}/cpf/{cpf}` via `httpx.AsyncClient(timeout=CPFHUB_TIMEOUT)`, header `x-api-key`.
3. Transitório (429 / 5xx) → **retry** (backoff `(0.2, 0.8)`, 3 tentativas — porte do legado).
4. CPF não encontrado (404 ou `success:false`) → **`None`**.
5. Erro real (rede, 401 key inválida, 429/5xx após esgotar retry) → **`raise CpfHubError`**.
6. Sucesso → **`CpfIdentity(cpf, name, name_upper, gender, birth_date)`** (`birth_date` de day/month/year).

Semântica de erro (Portão 1 Q3): **não-achado/inválido → `None`**; **erro real → exceção** (igual `cep`).
Validação de dígito verificador de CPF **não** mora aqui — é do domínio `profiles`. Não loga CPF/nome (PII).

## Config (.env, CONVENTION §8/§10)

| Chave | Default | O que é |
|---|---|---|
| `CPFHUB_API_KEY` | `""` | api-key da CPFHub (header `x-api-key`). Sem ela → `cpf.W001` (Warning) |
| `CPFHUB_BASE_URL` | `https://api.cpfhub.io` | base da API |
| `CPFHUB_TIMEOUT` | `5` | timeout do httpx (s) |

## Como validar (§8 — chamada real)

```bash
python manage.py cpfhub_lookup 09126367939   # CPF real → identidade (name/gender/birth_date)
python manage.py cpfhub_lookup 123           # formato inválido → "não encontrado" (sem chamar a API)
```

Evidência dos testes reais: `.claude/tests/1d-cpf.md`.

## Quem vai consumir

O futuro app `users/profiles` (MVP §4 item 3) importa `cpfhub.lookup()` direto (in-process, é
monólito) pra enriquecer o profile — *cpf puxa nome/gênero/nascimento* (VISAO). Sem endpoint HTTP
próprio: a tool é interna. Doc pública da CPFHub: <https://cpfhub.io>.
