# ADR 0001 — Consolidação em mono-repo

Status: aceita em 2026-08-15.

## Contexto

Backend, Notfire, app do cliente e app do promotor evoluíam em repositórios independentes.
Isso dificultava validar contratos entre serviços, reproduzir o ambiente local e coordenar
deploys que atravessam mais de um projeto.

## Decisão

Consolidar os quatro históricos em uma raiz Git, sem squash, usando estes limites:

- aplicações implantáveis em `apps/`;
- serviços e filas em `services/`;
- contratos, automações e documentação transversal na raiz;
- nenhum compartilhamento direto de banco ou importação de código entre serviços;
- integração exclusivamente por contratos HTTP/eventos versionados.

O Notfire continua um serviço autônomo e multi-tenant. Cada aplicativo usa uma conta e
chave próprias; mensagens recebidas e instâncias permanecem vinculadas ao aplicativo.

## Migração

1. Importar os históricos e validar que cada projeto continua construindo isoladamente.
2. Adicionar comandos de workspace e ambiente local integrado.
3. Transferir CI e deploy um serviço por vez, mantendo o repositório antigo somente leitura.
4. Arquivar os repositórios antigos apenas depois de produção apontar para o mono-repo.
5. Incorporar igreja e presença física em diretórios próprios após mapear seus contratos.

## Consequências

Mudanças ponta a ponta podem ser revisadas em um único commit/PR. Em contrapartida, os
pipelines precisam detectar caminhos afetados e cada unidade implantável deve preservar
seu próprio lockfile, imagem e configuração de execução.
