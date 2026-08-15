# core/sentry — captura de erro (Sentry / GlitchTip)

> Onde uma exceção de produção vai parar. **Opcional**: sem `SENTRY_DSN` o backend sobe igual e
> nada é enviado. Código: `core/sentry.py` · config: `core/settings.py` · testes:
> `tests/test_sentry.py` · check: `core/checks.py` (`sentry.W001` / `sentry.W002`).

## O que é

Hoje uma exceção morre no log JSON do host: alguém precisa estar olhando `journalctl` na hora
certa pra saber que quebrou. Com o DSN preenchido, o mesmo erro vira um evento agrupado, com
stacktrace e request, e avisa sozinho.

O SDK é o `sentry-sdk[django]`. O DSN pode ser do Sentry SaaS **ou de um GlitchTip self-hosted**
— o protocolo é o mesmo, nada no código depende de qual dos dois é.

> **Nota histórica.** O `settings.py` já tinha um `if SENTRY_DSN: sentry_sdk.init(...)` desde
> cedo, mas o `sentry-sdk` **nunca esteve no `pyproject.toml`** — era código morto, e o primeiro
> `.env` com DSN teria derrubado o boot no `import sentry_sdk`. Ficou também sem nenhum scrub de
> PII, que é o grosso do que este módulo faz.

## Config (`backend/.env`)

| Variável | Default | Pra que serve |
| --- | --- | --- |
| `SENTRY_DSN` | *(vazio)* | Vazio = **desligado**, o resto é ignorado. |
| `SENTRY_ENVIRONMENT` | `APP_ENV` | Separa prod/staging/preview/test no painel. Só sobrescreva se houver **dois deploys no mesmo `APP_ENV`** (ex.: `staging-v7m` e `staging-qa`). |
| `SENTRY_RELEASE` | *(SHA do HEAD)* | **Se resolve sozinho** — ver abaixo. Só preencha se o deploy não for um checkout git. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Fração de transações com tracing. Fora de `0.0–1.0` **trava o boot**. |
| `SENTRY_REQUEST_BODY` | `never` | `never` \| `small` \| `medium` \| `always`. Ver **LGPD** abaixo antes de afrouxar. |

Config quebrada levanta `ImproperlyConfigured` no import do settings (fail-fast, padrão do
`core/environment.py`) — um sample-rate inválido é aceito calado pelo SDK, e o efeito só apareceria
semanas depois na fatura.

### A release sai do próprio deploy

`SENTRY_RELEASE` vazio => o SHA do `HEAD` do checkout (`core.sentry.git_sha`). Isso é EXATO por
construção: o `deploy.yml` faz `git reset --hard <sha que passou no CI>` em `/opt/backend-supletivo`,
então o HEAD **é** a versão rodando. Ninguém precisa lembrar de editar o `.env` a cada subida — e
"esse erro começou em qual deploy?", que é a primeira pergunta de todo incidente, já vem respondida.

Best-effort em tudo: sem `git`, sem `.git` legível pelo usuário do serviço, ou timeout → fica sem
release e o resto funciona. **Nunca** derruba o boot. Roda uma vez por processo, no import do
settings, e **só quando há DSN** — em dev/CI o subprocesso nem é chamado.

## LGPD — as quatro camadas de scrub

Este backend carrega CPF, telefone, RG/CNH, comprovante de endereço, **selfie** e chave Pix. Um
evento de erro leva junto headers, query-string, corpo do request e as **variáveis locais de cada
frame** do stack — ou seja, o CPF que estourou o `ValueError` viaja no evento. Daí:

1. **`send_default_pii=False`** — hardcoded, **não é config**. Sem IP, sem cookies. Não virou flag
   de `.env` de propósito: é o tipo de chave que alguém liga "só pra debugar" e esquece ligada.
2. **`max_request_body_size="never"`** — o `send_default_pii=False` do SDK **gateia só os
   cookies**; o *corpo* do request continua sendo capturado (até 10KB no default `medium`). Como o
   funil dá POST de cpf/telefone/endereço/pix, o corpo fica fora por padrão. `SENTRY_REQUEST_BODY`
   afrouxa em dev/staging quando o corpo for justamente o que falta pra diagnosticar; em prod o
   `sentry.W002` avisa se estiver afrouxado.
3. **`EventScrubber(recursive=True)` com denylist estendida** — o default do SDK cobre
   senha/token/cookie, mas não o PII do nosso domínio (`cpf`, `phone`, `pix`, `otp`, `rg`, `cep`…).
   `recursive=True` porque o dado real vem aninhado (JSON do body, `vars` de frame).
4. **`before_send` (`scrub_event`)** — varre o evento inteiro e fecha os dois vazamentos que
   sobram:
   - **PII em texto livre** (mensagem de exceção, breadcrumb, linha de código), onde não há chave
     pra denylist casar;
   - **o token de `/media/<prefixo>/<token>.<ext>`**, que neste projeto **é a credencial** do
     arquivo (G1/#31) — mesma regra do log, via o `safe_path` reusado do `logging_middleware`.

### O que a máscara de texto pega (e o que não pega)

Só o que é reconhecível **sem ambiguidade** — mascarar "todo número longo" cegaria o diagnóstico
junto (id, status, valor, timestamp):

| Casa | Não casa |
| --- | --- |
| CPF formatado `529.982.247-25` | epoch em segundos (10 dígitos) |
| 11 dígitos exatos (CPF cru / telefone com DDD) | epoch em ms (13 dígitos, começa em `17`) |
| 12–13 dígitos começando em `55` (telefone com DDI) | id curto, valor, hash hex |

Máscara = `***` + os 2 últimos dígitos — a **mesma** do `_scrub_pii` do structlog, pra o evento no
painel e a linha no log JSON ficarem comparáveis a olho.

### Duas armadilhas do SDK que o módulo contorna

Ambas descobertas testando o envelope real; ambas com teste de regressão em `tests/test_sentry.py`.

- **O `EventScrubber` não varre o evento inteiro.** Ele cobre `request`, `extra`, `user`,
  `breadcrumbs`, `frames` e `spans` — e mais nada. Fica de fora `contexts`, que é exatamente onde
  `sentry_sdk.set_context("candidato", {...})` grava, e `tags`. Por isso o `_walk` do
  `before_send` **também filtra por chave**, no evento todo: seção nova do SDK já nasce coberta em
  vez de virar o próximo buraco.
- **Dentro do `before_send` só entram tipos JSON puros.** O `serialize()` do cliente roda **antes**
  do `before_send`, e é ele quem traduz o `AnnotatedValue` (o marcador de "filtrado" do SDK) em
  `[Filtered]` + `_meta`. Um `AnnotatedValue` criado no `before_send` perdeu esse trem e chega cru
  no `json.dumps` do envelope: `TypeError`, e o **evento inteiro some** — painel vazio, sem pista.
  Por isso o marcador daqui é a string `"[Filtered]"`, idêntica à que o SDK renderiza.

### Fail-closed

Se o scrub estourar, o evento é **descartado**, não enviado cru: vazar CPF pra um terceiro é pior
que perder um evento. Pra esse modo de falha não virar "Sentry silencioso e ninguém percebe", o
descarte grita um `log.error("sentry_scrub_failed")` no JSON local — que é justamente o que sobra
quando o Sentry cala. (O `_scrub_pii` do structlog é o oposto, fail-**open**: lá o log local é o
último recurso e perder a linha é pior.)

## O worker do Django-Q entra junto?

Entra, por tabela. O django-q2 não deixa a exceção da task subir — ele loga `ERROR`. Quem captura
é a `LoggingIntegration` do SDK (auto-enabling, converte `ERROR` em evento). Não há integração
oficial de django-q; é esse caminho que faz task quebrada aparecer no painel em vez de sumir.

## Testar sem esperar um erro real

```bash
# no host com o .env de verdade
uv run python manage.py shell -c "import sentry_sdk; sentry_sdk.capture_message('teste v7m')"
```

Sem `SENTRY_DSN` isso é no-op silencioso (é o esperado em dev). Pra conferir se o SDK subiu:

```bash
uv run python -c "
import django; django.setup()
from django.conf import settings; print('sentry ligado:', settings.SENTRY_ENABLED)"
```

## Checks

- `sentry.W001` — `APP_ENV=prod` sem `SENTRY_DSN`: sobe, mas exceção em prod morre no log do host.
- `sentry.W002` — `SENTRY_REQUEST_BODY` afrouxado (`medium`/`always`) em prod.

Os dois são **Warning**: Sentry é apoio, um deploy sem ele funciona igual — só fica cego. Quem
trava é o `init_sentry`, e só com config inválida.
