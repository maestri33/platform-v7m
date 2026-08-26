# 🛠️ Turborepo Contributing & Development Guidelines

Guia de desenvolvimento, compilação, testes e regras de contribuição no repositório do Turborepo (`github.com/vercel/turborepo`).

---

## 🧰 1. Dependências do Sistema

Para compilar e rodar a suíte completa de testes:

- **Rust**: Gerenciado via `rustup` seguindo a versão fixada em `rust-toolchain.toml`.
- **Node.js**: v22.x
- **pnpm**: v10.x
- **protoc**: Compilador de Protocol Buffers (`https://grpc.io/docs/protoc-installation/`).
- **capnp**: Ferramenta de serialização Cap'n Proto (`https://capnproto.org`).
- **Zig**: `>= 0.15.2` (necessário para compilar `libghostty-vt-sys` da TUI). O comando `zig` deve estar no `PATH`.
- **jq** e **zstd**:
  - Windows: `choco install jq zstandard`
  - Linux: `sudo apt install jq zstd`
  - macOS: `brew install jq zstd`
- **Opcionais**:
  - `bun`: para empacotar `@turbo/gen` (`bun build --compile`).
  - `uv`: para rodar a suíte de testes de workspace Python (`crates/turborepo/tests/uv_workspace_test.rs`).

---

## 🔨 2. Compilação do Projeto

```bash
# 1. Instalar dependências de frontend e ferramentas
pnpm install --frozen-lockfile

# 2. Compilação padrão (com rustls TLS e OpenTelemetry)
cargo build

# 3. Compilação alternativa com Native TLS (OpenSSL)
cargo build --no-default-features --features native-tls

# 4. Compilação leve sem OTel
cargo build -p turbo --no-default-features --features rustls-tls
```

---

## 🧪 3. Execução de Testes & Linters

```bash
# Executar todos os testes do workspace
cargo test

# Executar testes de um crate específico
cargo test -p turborepo-lib
cargo test -p turborepo-repository
cargo test -p turborepo-cache

# Executar um teste de integração específico do binário turbo
cargo test -p turbo --test force_test

# Executar linter estrito do projeto
cargo lint
```

---

## 🔍 4. Testes Manuais com `--skip-infer`

Ao testar as alterações do binário em repositórios de teste locais, crie um alias para o binário de desenvolvimento:

```bash
# Linux / macOS
alias devturbo='/caminho/para/turborepo/target/debug/turbo'
devturbo run build --skip-infer

# Windows PowerShell
Set-Alias devturbo "C:\caminho\para\turborepo\target\debug\turbo.exe"
devturbo run build --skip-infer
```

> [!IMPORTANT]
> A flag `--skip-infer` impede que o binário procure e delegue a execução para a versão do Turbo instalada localmente no repositório de teste.

---

## 🛡️ 5. Regras de Código & Pull Requests

1. **Sem `.unwrap()` / `.expect()`**: O Clippy reprova código de produção contendo panics potenciais. Trate todos os `Option` e `Result`.
2. **Sem `--no-verify`**: Todos os commits e pushes devem passar pelos pre-commit / pre-push hooks.
3. **Atualização de Documentação**: Se alterar o motor de execução, atualize `ARCHITECTURE.md`. Se alterar o setup de build, atualize `CONTRIBUTING.md`.
