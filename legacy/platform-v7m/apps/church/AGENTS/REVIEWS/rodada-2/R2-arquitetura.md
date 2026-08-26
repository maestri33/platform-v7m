## Nota: **7.2/10**

| # | Severity | Categoria | Localização | Finding | Fix |
|---|---|---|---|---|---|
| 1 | HIGH | Exportabilidade/produção | `DizimoCapture.tsx`, `Dizimo.tsx`, `API.md` | Adapter mock-only é default e entra na rota pública. | Exigir adapter e separar mock em wrapper demo fora do caminho de produção. |
| 2 | HIGH | Contrato/cartão | `CardRedirect.tsx`, `useDizimoCapture.ts` | Cartão ignora redirect_url e marca paid localmente. | Navegar ao checkout e aceitar paid somente de fonte autoritativa. |
| 3 | MED | Privacidade/cópia | `DizimoForm.tsx`, `contract.ts` | UI diz que dados nunca tocam servidor, mas envia nome e email. | Usar cópia verdadeira e documentar tratamento. |
| 4 | MED | Learning/migração | `round-1.plan.json`, `post-round-learning.mjs` | Plano v1 aplicado não contém inputDigests da política v2. | Marcar histórico v1 aplicado como não replayável ou migrar. |
| 5 | LOW | Dedupe webhook | `useChargeStatus.ts` | Set de eventos não tem limite e aceita fallback sem chave. | Exigir chave e limitar cache. |
| 6 | LOW | Testes de produção | `DizimoCapture.test.tsx` | Falta teste protegendo rota pública contra mock e redirect do cartão. | Adicionar guards de produção e teste de redirect. |

## Verdict

block
