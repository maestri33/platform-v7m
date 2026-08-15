# cep — integrations/tools/cep (ViaCEP)

> **ESTADO:** tool de CEP (lookup ViaCEP) — feita, testada com chamadas REAIS e **aprovada no
> Portão 3** (Victor 2026-06-01). Caminho do MVP §4 item 1 (subgrupo **tools**). Label do app: `cep`.
> É **só o cliente** — quem persiste/expõe endereço é o app `users/address` (ainda não existe).

App Django que porta a integração **ViaCEP** do micro legado (`~/coders/backend/address`, FastAPI)
pro monólito, como *tool* de apoio (CONVENTION §2/§8: `integrations/tools/<funcao>/scripts/`).
**ViaCEP é API pública — sem api-key**, logo sem system check de credencial e sem models/migração.

## O que faz

`integrations/tools/cep/scripts/viacep.py` → `async def lookup(zipcode) -> dict | None`:

1. Limpa o CEP pra 8 dígitos. `len != 8` → **`None`** (nem chama a ViaCEP).
2. `GET {VIACEP_BASE_URL}/ws/{cep}/json/` via `httpx.AsyncClient(timeout=VIACEP_TIMEOUT_SECONDS)`.
3. Rede caiu / status != 200 → **`raise ViaCepUnavailable`** (quem chama decide degradar).
4. ViaCEP devolve `{"erro": true}` (CEP inexistente) → **`None`**.
5. Sucesso → dict normalizado **`{zipcode, street, complement, neighborhood, city, state}`**
   (mapeia `logradouro / complemento / bairro / localidade / uf`).

Semântica de erro idêntica ao legado: **inexistente/inválido → `None`**; **fora do ar → exceção**.
Validação "dura" de CEP (rejeitar dígitos iguais etc.) **não** mora aqui — é do domínio `address`.

## Config (.env, CONVENTION §8/§10)

| Chave | Default | O que é |
|---|---|---|
| `VIACEP_BASE_URL` | `https://viacep.com.br` | base da API pública |
| `VIACEP_TIMEOUT_SECONDS` | `5` | timeout do httpx |

## Como validar (§8 — chamada real)

```bash
python manage.py viacep_lookup 01001000      # Praça da Sé, SP
python manage.py viacep_lookup 99999999      # inexistente → "não encontrado"
```

Evidência dos testes reais: `.claude/tests/1d-cep-viacep.md`.

## Quem vai consumir

O futuro app `users/address` (MVP §4 item 3) importa `viacep.lookup()` direto (in-process, é
monólito) no `POST /external_id/{CEP}` da `specs/address.md`. Sem endpoint HTTP próprio: a tool é
interna.
