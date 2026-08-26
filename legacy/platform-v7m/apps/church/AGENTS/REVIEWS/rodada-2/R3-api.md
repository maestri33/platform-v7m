## Nota: **7.2/10**

| # | Severity | Categoria | Localização | Finding | Fix |
|---|---|---|---|---|---|
| 1 | HIGH | Segurança/produção | `DizimoCapture.tsx`, `Dizimo.tsx`, `API.md` | Mock-only é default e entra no build público. | Exigir cliente real e isolar demo. |
| 2 | HIGH | Pagamento cartão | `DizimoCapture.tsx`, `useDizimoCapture.ts` | Cartão simula paid sem usar redirect_url. | Redirecionar e obter paid apenas por webhook ou polling. |
| 3 | MED | Token de sessão | `CardRedirect.tsx` | session_id é exposto no DOM. | Não renderizar identificador interno. |
| 4 | MED | Validação top-level | `dizimoApi.ts` | null ou undefined podem falhar antes do schema e do INVALID_REQUEST. | Validar unknown antes de acessar campos e testar. |
| 5 | MED | Webhook idempotência | `useChargeStatus.ts` | Evento sem idempotency_key é aceito e cache não é limitado. | Descartar evento inválido e limitar dedupe. |
| 6 | LOW | Compliance/PII | `DizimoForm.tsx` | Promessa de privacidade contradiz payload. | Corrigir a cópia. |
| 7 | LOW | Testes faltantes | `src/api`, `components/dizimo` | Faltam guards para mock, redirect, null e webhook inválido. | Adicionar testes adversariais. |

## Verdict

block
