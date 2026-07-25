# Evolution GO — correção do pool PostgreSQL

Produção usa temporariamente uma imagem local baseada no commit
`03289559d547911d92ad58837db98faeb0c5fd8e` da PR upstream
`evolution-foundation/evolution-go#117`.

## Motivo

A imagem oficial `0.7.2` cria um novo `sqlstore.Container` a cada conexão ou
reconexão. Os pools não são fechados e o PostgreSQL chega a `too many clients`,
fazendo o canal de OTP responder 401.

A correção compartilha um único pool limitado e permite nova tentativa quando a
primeira inicialização do banco falha.

## Evidência aplicada em 2026-07-24/25

- Teste: `go test ./pkg/whatsmeow/service` passou.
- Imagem: `evolution-go:v0.7.2-poolfix-0328955`.
- Conexões antes: 105.
- Conexões após a troca e o teste real: 10.
- Notify: WhatsApp `sent`, uma tentativa, sem erro.
- Evolution GO: `Connected=true`, `LoggedIn=true`.

## Produção

O override deve ficar em:

`/opt/evolution-go-deploy/docker-compose.override.yml`

Aplicação:

```bash
cd /opt/evolution-go-deploy
docker compose up -d --no-deps evolution-go
```

O PostgreSQL não deve ser reiniciado nessa troca.

## Rollback

A imagem anterior foi preservada como
`evolution-go:rollback-v0.7.2-9337afc`, e o compose original como
`docker-compose.yml.before-20260724-poolfix`.

Para voltar:

1. Remova `docker-compose.override.yml`.
2. Execute `docker compose up -d --no-deps evolution-go`.
3. Confirme `/instance/status` e um envio técnico pelo notify.

Substitua esta imagem local por uma release oficial somente quando a PR #117 (ou
correção equivalente) estiver incorporada e publicada.
