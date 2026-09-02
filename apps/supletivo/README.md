# 🎓 @v7m/supletivo — Portal do Aluno, KYC & Matrícula

Aplicação Next.js 16 Standalone que serve o **Portal do Aluno**, **Funil de Vendas** e **Wizard de Matrícula** do Supletivo Brasil em `app.supletivo.net.br` (porta host `:3020` / container `:3000`).

---

## ⚡ Comandos Rápidos

```bash
# Iniciar servidor de desenvolvimento (porta 3020)
pnpm dev

# Executar verificação de tipos TypeScript
pnpm check-types

# Executar linter
pnpm lint

# Compilar para produção
pnpm build
```

---

## 🏗️ Estrutura Principal

- `src/app/(funil)/`: Telas do funil de captura e conversão de novos alunos (Telefone, OTP, CPF, E-mail, Planos, Checkout).
- `src/app/matricula/`: Wizard documental sequencial (RG Frente/Verso, Endereço com comprovante, Escolaridade e Selfie com liveness).
- `src/app/aluno/`: Sala de aula e painel acadêmico (credenciais AVA/SIGA, tipo sanguíneo, envio de documentos complementares).
- `src/app/provas/`: Agendamento e acompanhamento de avaliações presenciais no polo e pendências.
- `src/components/blocks/`: Motor de banners e tratamento humanizado de pendências e bloqueios documentais.
