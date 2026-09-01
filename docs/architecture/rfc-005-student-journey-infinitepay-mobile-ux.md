# RFC 005 — Homologação E2E da Jornada do Aluno, InfinitePay e UI/UX Mobile

- **Status:** Implementado & Homologado
- **Data:** 2026-09-01
- **Autor:** Victor Maestri & Hermes Agent (Squad QG V7M)
- **Escopo:** `apps/app-supletivo`, `services/backend`, `packages/ui`

---

## 1. Contexto e Motivação

Durante os testes de homologação física da jornada do aluno no portal `app.supletivo.net.br` utilizando o ambiente compartilhado noVNC (`http://10.0.1.35:6080/vnc.html`) e instrumentação via Chrome DevTools Protocol (CDP `:9222`), foram identificados pontos de melhoria essenciais de usabilidade móvel, integração com gateway comercial InfinitePay e desacoplamento do pipeline de validação de documentos.

---

## 2. Implementações Realizadas

### 2.1. UI/UX Mobile: Rodapé Sanfona Expansível (`@v7m/ui`)
- **Problema:** Em telas verticais de smartphones e viewports mobile (500x932), o rodapé institucional ocupava espaço excessivo, competindo com formulários e CTAs essenciais.
- **Solução:** Desenvolvimento do componente `ExpandableSiteFooter` em `packages/ui/src/components/expandable-site-footer.tsx`.
  - Atua como uma barra compacta recolhida exibindo marca, copyright e indicador de expansão.
  - Expande sob demanda ao toque/clique para exibir dados corporativos (CNPJ `48.811.016/0001-00`, e-mail de suporte, termos de uso, privacidade e selos de conformidade MEC/LDB).
  - Integrado e exportado no pacote `@v7m/ui`.

### 2.2. Gateway de Pagamento: Integração Oficial InfinitePay
- **Problema:** Ao selecionar pagamento com cartão, URLs internas de desenvolvimento eram propagadas incorretamente e números de telefone no padrão nacional sofriam interpretação ambígua de DDI.
- **Solução:**
  - `users/roles/lead/checkout_links.py`: Leitura dinâmica de `EXTERNAL_URL` via `get_setting()` com fallback para `https://app.supletivo.net.br`.
  - `services/backend/api/clients/schemas.py`: Adicionado campo `url: str | None = None` no schema `CheckoutOut`.
  - `users/roles/lead/service.py`: Formatação de telefone com padrão internacional E.164 (`+55...`), pré-preenchendo dados completos no checkout oficial da InfinitePay (`checkout.infinitepay.io/v7m/...`).
  - Preço de sandbox unificado em R$ 1,00 para validação sem atrito.

### 2.3. Roteamento Pós-Login & Imutabilidade de CPF
- **Problema:** Ao fazer login OTP, alunos já matriculados ou em transição eram direcionados à tela de CPF antes do roteamento correto por roles.
- **Solução:**
  - `apps/app-supletivo/src/app/_lead/use-lead-flow.ts`: Decodificação imediata de claims do JWT (`access_token`) em `goAfterLogin`, roteando papéis `enrollment` instantaneamente para `/matricula` e `student` para `/aluno`.
  - `services/backend/users/profiles/interface/__init__.py`: Regra de imutabilidade estrita de CPF (`CPF_ALREADY_SET` com código HTTP 409) impedindo alteração indevida de CPF já confirmado no perfil.

### 2.4. Desacoplamento da Validação de Documentos (RG)
- **Diretriz de Arquitetura:**
  - **1ª Validação (Fast-Path / Frontend):** Verificação instantânea no cliente de legibilidade e tipo de arquivo antes do upload, liberando o aluno para avançar imediatamente.
  - **2ª Validação (Background / Async Worker):** Processamento assíncrono profundo (OCR, conferência e biometria) executado pelas filas Django-Q (`qcluster-slow`), evitando bloqueio síncrono da tela do aluno.
  - Integração dinâmica de OCR/Visão com o gateway OmniRoute (`10.0.1.35/v1`) via `get_setting()`.

---

## 3. Matriz de Testes e Evidências

- **Testes Automatizados Backend:** 436/436 testes aprovados (`uv run pytest`).
- **Verificação de Tipos Frontend:** 100% aprovado (`pnpm run check-types`).
- **Homologação Física:** Pagamento de R$ 1,00 processado com sucesso na InfinitePay, transição automática para `Enrollment` e renderização completa no noVNC.
