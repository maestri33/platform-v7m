# 🧭 Plano de Testes E2E: Promotor Home & Central de Vendas (`specs/promotor-home.md`)

> **Agente**: `playwright-test-planner`  
> **Aplicação-Alvo**: `@v7m/app-promotor` (`apps/app-promotor`)  
> **Porta de Teste**: `3107` (Mock Backend em `8765`)  
> **Data**: 2026-08-27

---

## 🎯 1. Objetivo do Teste
Validar de ponta a ponta a experiência de entrada e operação do Promotor de Vendas:
1. **Entrada e Autenticação OTP**: Acesso por CPF/Telefone válido e código OTP `000000`.
2. **Carregamento da Central de Captação**: Visualização do link de indicação exclusivo e meta semanal.
3. **Modal de QR Code**: Abertura, renderização do canvas e cópia do link no clipboard.
4. **Modelos de Abordagem WhatsApp**: Alternância dinâmica de templates de vendas (Bolsa & Oportunidade, Urgência, etc.).

---

## 📋 2. Matriz de Cenários & Passos de Execução

### Cenário 1: Jornada Completa de Entrada e Compartilhamento de Link
- **Passo 1 (Reset do Ambiente)**: Enviar POST para `/__reset` e `/__promote` no mock backend.
- **Passo 2 (Navegação)**: Acessar `http://127.0.0.1:3107/`.
- **Passo 3 (Identificação)**: Preencher CPF `52998224725` no campo `#auth-cpf` ou input principal e clicar em `Continuar`.
- **Passo 4 (Validação de OTP)**: Preencher código `000000` no input `código de 6 dígitos` e submeter `Entrar`.
- **Passo 5 (Acesso ao Painel)**: Confirmar redirecionamento para `/painel` com título de boas-vindas visível.
- **Passo 6 (Interação com QR Code)**: Clicar no botão `QR Code`, verificar abertura da modal com `Copiar link` e fechar o diálogo.
- **Passo 7 (Templates de Mensagens)**: Clicar em `Trocar modelo` e selecionar o template `Bolsa & Oportunidade`.

---

## 🛡️ 3. Asserções Críticas de Negócio (Invariantes)
- `expect(page.getByRole("heading", { name: /olá,/i })).toBeVisible()`
- `expect(page.getByText(/seu link de indicação/i)).toBeVisible()`
- `expect(page.getByRole("dialog", { name: /qr code/i })).toBeVisible()`
- `expect(page.getByText(/Bolsa & Oportunidade/i)).toBeVisible()`
