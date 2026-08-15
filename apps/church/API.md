# API — Módulo de Dízimo

> Contrato público provider-agnostic de `src/api/`.

**Versão:** 1.2.0  
**Data:** 2026-08-13  
**Status:** o fluxo público usa `httpDizimoApi.ts`, um adapter de rede para o
backend da própria origem. O adapter `dizimoApi.ts` continua **MOCK ONLY**,
somente para testes e demos explicitamente injetados; ele não é fallback do
componente nem é importado pela rota `/dizimo`.

## Conceitos

- Valores monetários são inteiros em centavos (`amount_cents`).
- Datas são ISO 8601 UTC.
- Toda criação financeira exige UUID v4 em `idempotency_key`.
- O backend sempre revalida o request. A validação no componente é apenas UX.
- O conteúdo de QR é opaco e definido pelo adapter; a UI não assume provedor.
- Webhooks têm identidade própria e podem ser entregues mais de uma vez.
- `day_of_month` preserva a escolha 1–31. O adapter real deve documentar a
  política para meses que não possuem o dia solicitado; o mock não agenda
  cobranças mensais reais e não converte silenciosamente 29–31 para 28.

## Tipos compartilhados

```ts
type PaymentMethod = 'pix' | 'cartao';
type RecurrenceInterval = 'monthly' | 'none';
type ChargeStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired';

interface ChargeRequest {
  idempotency_key: string; // UUID v4 estável por tentativa lógica
  amount_cents: number;
  method: PaymentMethod;
  recurrence: {
    enabled: boolean;
    day_of_month: number;
    interval: RecurrenceInterval;
  };
  donor: {
    name: string;
    email: string;
    cpf?: string;
  };
  metadata?: Record<string, string>;
}
```

## Adapter HTTP usado pela rota pública

`DizimoCapture` exige um `apiClient: DizimoApi`. Isso impede uma troca silenciosa
para dados simulados. A rota `/dizimo` injeta `httpDizimoApi`, configurado com a
base relativa `/api/dizimo`, credenciais somente da mesma origem e timeout de 15
segundos por request. O timeout é traduzido para `PROVIDER_TIMEOUT`; assim a UI
volta do estado de envio e permite nova tentativa com a mesma chave idempotente.

| Operação | HTTP |
|---|---|
| criar cobrança | `POST /api/dizimo/charges` |
| consultar cobrança | `GET /api/dizimo/charges/:id` |
| cancelar recorrência | `DELETE /api/dizimo/recurrences/:id` |
| receber eventos | `EventSource /api/dizimo/events` |

Criação e consulta retornam envelope consistente:

```json
{ "success": true, "data": { "id": "ch_...", "status": "pending" } }
```

Erros retornam `{ "success": false, "error": { "code": "...", "message": "..." } }`.
Respostas são validadas em runtime. `redirect_url` de cartão aceita apenas HTTPS
ou caminho relativo da mesma origem; esquemas executáveis como `javascript:` são
recusados. Se SSE não estiver disponível, o polling continua sendo a fonte de
reconciliação no cliente.

> Este adapter implementa o transporte HTTP real, mas não cria o backend nem
> prova que os endpoints estão publicados. Sem backend compatível, a página
> continua renderizando e exibe erro recuperável ao tentar criar a cobrança.

## `createCharge(req): Promise<Charge>`

Cria uma cobrança pontual ou recorrente. O backend deve fazer revalidação
server-side independente antes de tocar o provedor.

```ts
const request: ChargeRequest = {
  idempotency_key: crypto.randomUUID(),
  amount_cents: 10_000,
  method: 'pix',
  recurrence: {
    enabled: true,
    day_of_month: 22,
    interval: 'monthly',
  },
  donor: {
    name: 'Nome do doador',
    email: 'doador@example.org',
  },
};

const charge = await api.createCharge(request);
```

Resposta:

```ts
interface Charge {
  id: string;
  status: ChargeStatus;
  amount_cents: number;
  method: PaymentMethod;
  recurrence_id?: string;
  created_at: string;
  expires_at: string;
  payment: {
    pix?: {
      qr_code_payload: string; // SVG, data URL ou URL HTTPS
      copy_paste: string;
      txid: string;
    };
    card?: {
      redirect_url: string;
      session_id: string; // opaco; nunca exibido no DOM
    };
  };
}
```

### Garantia de idempotência

- Mesma `idempotency_key` + mesmo request retorna a mesma cobrança, inclusive
  quando as chamadas chegam concorrentemente.
- Mesma `idempotency_key` + request diferente lança
  `IDEMPOTENCY_CONFLICT` com status `409`.
- Falha transitória anterior à criação não consome a chave; o retry com a mesma
  chave pode criar a cobrança.
- Em HTTP, o adapter real pode transportar o mesmo valor no header
  `Idempotency-Key`; o adapter público transporta o valor tanto no header quanto
  no corpo para manter o contrato compartilhado.
- O cliente gera a chave ao iniciar a tentativa lógica, guarda-a e a reutiliza
  em timeout/retry. Uma nova intenção do usuário recebe uma nova chave.

Metadados entram no fingerprint em ordem canônica. A chave não entra no
fingerprint e nunca deve aparecer em logs.

### Erros

- `INVALID_AMOUNT` — valor menor que 100 centavos.
- `INVALID_REQUEST` (400) — payload runtime malformado, enum desconhecido,
  número não inteiro/finito ou recorrência incoerente.
- `INVALID_DAY` — dia fora de 1–31 quando a recorrência está ativa.
- `INVALID_EMAIL` — e-mail ausente ou inválido.
- `INVALID_NAME` — nome ausente ou curto.
- `INVALID_IDEMPOTENCY_KEY` (400) — chave ausente ou fora do formato UUID v4.
- `IDEMPOTENCY_CONFLICT` (409) — chave reutilizada com conteúdo diferente.
- `PROVIDER_ERROR` (502) — falha sistêmica do provedor.
- `PROVIDER_TIMEOUT` (504) — provedor excedeu o tempo limite.

## `getCharge(id): Promise<Charge>`

Obtém o estado autoritativo para polling e reconciliação.

- `CHARGE_NOT_FOUND` (404) se o id não existe.
- Um status terminal (`paid`, `failed`, `expired`) não regride no mock.
- A UI deve reconciliar polling e webhook por máquina de estados, em vez de
  aplicar dois `setState` independentes.

## `cancelRecurrence(id): Promise<void>`

Cancela a recorrência e emite `recurrence.canceled`.

- `RECURRENCE_NOT_FOUND` (404) se o id não existe.
- O evento de recorrência omite `charge_id`; string vazia não é usada.

## Webhook

```ts
type WebhookEventType =
  | 'charge.paid'
  | 'charge.failed'
  | 'charge.expired'
  | 'recurrence.created'
  | 'recurrence.canceled';

interface WebhookEvent {
  type: WebhookEventType;
  charge_id?: string;
  recurrence_id?: string;
  idempotency_key: string;
  timestamp: string;
}
```

O consumidor mantém um conjunto limitado das `idempotency_key` já processadas
e ignora reentregas. A correlação deve testar a presença de `charge_id`:

```ts
const processed = new Set<string>();

api.onWebhookEvent((event) => {
  if (processed.has(event.idempotency_key)) return;
  processed.add(event.idempotency_key);

  if (event.charge_id === currentCharge.id) {
    // reconciliar pela máquina de estados
  }
});
```

Em produção:

- Entrega é **at-least-once**.
- O servidor verifica assinatura HMAC antes de publicar o evento ao cliente.
- A deduplicação usa `idempotency_key`, não apenas `charge_id`.
- Retries usam backoff e vão para reconciliação manual após o limite.

O `EventSource` é um canal de notificação, não uma confirmação autônoma do
provedor: o backend só deve publicar eventos depois de validar assinatura e
persistir a transição. A UI mantém polling como reconciliação.

## Erros tipados

`DizimoError` expõe três decisões separadas:

```ts
error.isRetryable();      // mesma operação pode ser repetida
error.isUserActionable(); // o doador consegue corrigir os dados
error.isRecoverable();    // união compatível dos dois casos acima
```

| Categoria | `isRetryable` | `isUserActionable` |
|---|---:|---:|
| `NETWORK_ERROR`, `PROVIDER_TIMEOUT`, `PROVIDER_ERROR` | sim | não |
| `INVALID_AMOUNT`, `INVALID_DAY`, `INVALID_EMAIL`, `INVALID_NAME` | não | sim |
| conflito de idempotência e recursos não encontrados | não | não |

## Máquina de estados

```text
pending -> processing -> paid
   |            |
   |            +-----> failed
   +------------------> failed
   +------------------> expired
```

`paid`, `failed` e `expired` são terminais. Retry de pagamento cria uma nova
cobrança; replay idempotente de criação devolve a cobrança original.

## Observabilidade segura

O mock registra, somente em desenvolvimento, entrada, saída e erro de cada
operação. Campos permitidos incluem operação, fase, ids de recurso, valor,
método, status, duração e código de erro.

Nunca registrar:

- nome, e-mail ou CPF;
- `idempotency_key` de request;
- `copy_paste` Pix, QR ou token de sessão;
- mensagens/cause que possam conter resposta bruta do provedor.

Na UI, nome e e-mail são enviados ao backend para criar a contribuição; por
isso a interface não promete que esses dados “nunca tocam nosso servidor”.
Dados de cartão não são coletados por este componente: o navegador navega para
o `redirect_url` do checkout hospedado, e `session_id` não é renderizado.

Em produção, o adapter envia o mesmo esquema sanitizado para a solução de
observabilidade adotada.

## Comportamento do mock

As funções que geram QR/BR Code, simulam validação, latência, falhas e webhook
estão marcadas com `⚠️ MOCK ONLY`. Todos os timers usam
`globalThis.setTimeout`, compatível com browser, SSR e testes.

O mock:

- persiste somente em memória;
- gera QR visual e BR Code ilustrativos, inválidos para pagamento real;
- permite injetar falha, timeout e timing determinístico em testes;
- cancela timers pendentes em `__resetMockState()`.

O mock só deve aparecer em testes ou previews que façam injeção explícita:

```tsx
<DizimoCapture apiClient={dizimoApi} />
```

Não existe valor default para `apiClient`; a rota pública injeta
`httpDizimoApi`.

### Confirmação e Dashboard financeiro

O status `paid` nunca é fabricado pelo cliente. Ele só chega ao componente por
resposta autoritativa do backend via polling ou evento já validado. A
persistência e a atualização do Dashboard financeiro devem ocorrer no backend,
na mesma transição idempotente que confirma a cobrança — não em um callback do
navegador.

Se o host precisar sincronizar estado de tela ou analytics, pode passar
`onPaid(charge)`. O componente dispara esse callback uma única vez por cobrança
confirmada. O callback não substitui persistência, webhook ou conciliação do
servidor.

## Checklist do adapter de produção

- [ ] Persistência durável e transação para cobrança + chave idempotente.
- [ ] Constraint única para `idempotency_key` e conflito 409 determinístico.
- [ ] Revalidação server-side com schema; validação do cliente é apenas UX.
- [ ] Assinatura HMAC e deduplicação durável de webhooks.
- [ ] HTTPS, rate limiting e autenticação/autorização.
- [ ] Logging estruturado sem PII, segredo ou payload financeiro.
- [ ] Checkout hospedado/tokenizado; nunca receber cartão cru.
- [ ] Consentimento e retenção de dados compatíveis com LGPD.
- [ ] Testes unitários, integração com banco e E2E do provedor sandbox.

## Testes

```powershell
npm.cmd test -- src/api/__tests__/contract.test.ts src/api/__tests__/dizimoApi.test.ts
npm.cmd test -- src/api/__tests__/httpDizimoApi.test.ts src/pages/Dizimo.test.tsx src/components/dizimo/CardRedirect.test.tsx
```

Os testes cobrem validação runtime, helpers de erro, idempotência sequencial e
concorrente, conflito 409, liberação da chave após falha, Pix/cartão, polling,
webhook com chave deduplicável, cancelamento, logging sem PII e erros tipados.
Também guardam a rota pública contra regressão para o mock, validam o transporte
HTTP idempotente e garantem redirecionamento por `redirect_url` sem expor token
de sessão nem fabricar o estado `paid` no navegador.
