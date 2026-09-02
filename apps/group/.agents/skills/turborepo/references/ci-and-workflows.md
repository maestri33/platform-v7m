# 🔄 Turborepo CI & Workflow Scheduling Reference

Diretrizes e arquitetura de integração contínua (CI/CD) e workflows do repositório oficial do Turborepo (`github.com/vercel/turborepo`).

---

## ⚙️ 1. Filosofia de Agendamento de Tarefas no CI

- **Sem Pré-Classificação de Caminhos**: Os workflows de teste e linting não tentam pré-classificar caminhos alterados com scripts ad-hoc de diff.
- **Uso do Grafo de Tarefas e Cache**: Os jobs de PR são executados de maneira uniforme e previsível, deixando que o próprio grafo de tarefas (`task graph`) e o sistema de cache do Turborepo determinem o que precisa ser reexecutado.

---

## 🔐 2. Autenticação do Remote Cache via OIDC

- **PRs do Próprio Repositório (Same-repo PRs)**:
  - Autenticam-se automaticamente no Vercel Remote Cache utilizando OpenID Connect (OIDC) com permissão de leitura e escrita para acelerar os builds de CI.
- **PRs de Forks**:
  - Por questões de segurança contra injeção de segredos, PRs originados de forks externos permanecem restritos ao cache local (`local-only`).

---

## 📦 3. Caching de Estado do Cargo Target

- O CI em Rust restaura o estado completo do diretório `target` do Cargo em Ubuntu, macOS e Windows a partir de snapshots confiáveis da branch `main`.
- Apenas a branch `main` possui permissão para atualizar/gravar novos snapshots do estado do target.
- O dogfooding do `sccache` dentro do próprio repositório é desativado para garantir isolamento e estabilidade determinística.

---

## 🖥️ 4. Shards de Testes de TUI e Terminal Control

- Os shards de teste em Linux Rust incluem testes de integração black-box para o controle de terminal (`terminal-control` TUI).
- Testam comportamento de rendering em TTYs virtuais, captura de ANSI escape sequences e suporte ao `libghostty-vt-sys`.
