# Correção do pool PostgreSQL — OBSOLETA (2026-07-29)

A imagem local `evolution-go:v0.7.2-poolfix-0328955` foi construída em 2026-07-24
a partir da PR upstream #117, porque a `0.7.2` oficial vazava pools de conexão até
`too many clients`.

Na migração para o `pve-prod` descobriu-se que **produção não estava usando essa
imagem**: o container rodava `evoapicloud/evolution-go:latest`, que já registra
`Conectado ao banco AUTH PostgreSQL com pool configurado` — ou seja, incorporou a
correção. O override tinha sido revertido em algum momento sem atualizar este doc.

A imagem local também não serve mais: por ser build de fonte, não carrega licença
e a API responde `503 LICENSE_REQUIRED`.

Defesa que ficou no lugar: o Postgres agora é compartilhado (CT 20100), então o
papel `evogo` tem `CONNECTION LIMIT 20`. Se o vazamento voltar, ele estrangula a
própria GO em vez de derrubar o `notify_server` e o `evolution`.

Ver `deploy/evolution-go/README.md`.
