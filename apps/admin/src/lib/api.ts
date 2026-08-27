import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/config";
import { clearSession, getAccessToken, getRefreshToken, saveLogin } from "@/lib/session";

/* ============================== errors ============================== */

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable error code (e.g. STAFF_ONLY, PLATFORM_LOGIN_TAKEN), from `code`. */
  readonly code?: string;
  /** Structured error context, from `extra`. */
  readonly extra?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === "AbortError") {
    return "Tempo esgotado. Verifique sua conexão e tente novamente.";
  }
  return "Não foi possível conectar. Verifique sua conexão e tente novamente.";
}

/* ============================ http core ============================= */

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  headers?: Record<string, string>;
  json?: unknown;
  /** Arbitrary multipart form (manual payment, video upload). Wins over `json`. */
  form?: FormData;
  token?: string;
  timeoutMs?: number;
}

/**
 * Retenta quando a conexão morre ANTES de virar resposta (`fetch` rejeita com TypeError).
 * Keep-alive ocioso que a borda fecha e o browser reusa.
 */
const RETRY_DELAYS_MS = [250, 900];

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await requestOnce<T>(path, opts);
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return await requestOnce<T>(path, opts);
}

async function requestOnce<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? API_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers ?? {}) };
    let body: BodyInit | undefined;
    if (opts.form) {
      body = opts.form; // browser sets multipart boundary
    } else if (opts.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.json);
    }
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? (body !== undefined ? "POST" : "GET"),
      headers,
      body,
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as {
      detail?: string;
      code?: string;
      extra?: Record<string, unknown>;
    } | null;
    if (!res.ok) {
      throw new ApiError(data?.detail ?? `Erro ${res.status}`, res.status, data?.code, data?.extra);
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

let refreshPromise: Promise<LoginResponse> | null = null;

async function refreshAuthTokens(): Promise<LoginResponse> {
  if (!refreshPromise) {
    const refresh = getRefreshToken();
    if (!refresh) {
      throw new ApiError("Sessão expirada. Entre novamente.", 401);
    }
    refreshPromise = request<LoginResponse>("/api/v1/staff/auth/refresh", {
      json: { refresh_token: refresh },
    })
      .then((tokens) => {
        saveLogin({ ...tokens });
        return tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Authenticated request with silent refresh: on 401, exchanges the refresh_token
 * once (POST /staff/auth/refresh) and retries. If refresh also fails, the
 * session is cleared so the guard sends the user back to /login.
 * Single-flight mutex prevents concurrent refresh race conditions.
 */
async function requestAuth<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError("Sessão expirada. Entre novamente.", 401);
  try {
    return await request<T>(path, { ...opts, token });
  } catch (error: unknown) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    try {
      const tokens = await refreshAuthTokens();
      return await request<T>(path, { ...opts, token: tokens.access_token });
    } catch {
      clearSession();
      throw new ApiError("Sessão expirada. Entre novamente.", 401);
    }
  }
}

/* ============================== auth =============================== */
/*
 * O backend tem login de staff DEDICADO (grupo /staff/auth), com gate por
 * `is_superuser` no banco (não pelas roles do JWT). Fluxo: check (por TELEFONE) →
 * OTP → login. No login, não-superuser leva 403 code NOT_STAFF — então a
 * própria emissão do token já barra quem não é staff (sem precisar sondar).
 * confirmStaff() segue existindo só como defesa-em-profundidade do guard das
 * telas autenticadas (use-require-staff), não no fluxo de login.
 */

/** Código de erro do login quando o usuário não é superuser. */
export const NOT_STAFF_CODE = "NOT_STAFF";

/** Response of POST /staff/auth/check (shape enxuto — sem whatsapp/roles). */
export interface CheckResponse {
  found: boolean;
  external_id: string | null;
  otp_sent: boolean;
  otp_wait: number | null;
}

/** Check a phone against the staff base + dispatch OTP. `phone` = digits-only (10/11, DDD+número). */
export function checkPhone(phone: string): Promise<CheckResponse> {
  return request<CheckResponse>("/api/v1/staff/auth/check", { json: { phone } });
}

/** JWT bearer pair (TokenOut). */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** Verify the OTP. Flat body {external_id, otp}. Não-superuser → 403 NOT_STAFF. */
export function loginOtp(externalId: string, otp: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/staff/auth/login", {
    json: { external_id: externalId, otp },
  });
}

/** Login de contingência do staff com Senha Master (sem WhatsApp OTP). */
export function loginStaffPassword(identifier: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/staff/auth/login-password", {
    json: { identifier, password },
  });
}


/** WhoamiOut — identity echo (every group exposes it; auth-only, no superuser gate). */
export interface WhoAmI {
  external_id: string;
  roles: string[];
  name?: string | null;
  photo_url?: string | null;
  avatar_url?: string | null;
}

export function whoami(): Promise<WhoAmI> {
  return requestAuth<WhoAmI>("/api/v1/staff/whoami");
}

/**
 * Defesa-em-profundidade do guard das telas autenticadas: confirma que o usuário
 * logado é SUPERUSER sondando uma rota protegida do staff (GET /staff/system passa
 * por require_superuser). 403 STAFF_ONLY → não é staff. Devolve o SystemStatus de
 * brinde (a dashboard reusa). Propaga ApiError(403). O login dedicado (/staff/auth)
 * já barra não-staff no token, então isto é só uma segunda trava no carregamento.
 */
export function confirmStaff(): Promise<SystemStatus> {
  return getSystemStatus();
}

/* ============================== media ============================== */

/** Prefixa um path RELATIVO do backend com /media/ (rewrite no next.config). null-safe, idempotente. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/media/")) {
    return path;
  }
  return `/media/${path.replace(/^\/+/, "")}`;
}

/* ============================== hubs =============================== */

export interface HubAddress {
  cep: string | null;
  zipcode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

export interface Hub {
  external_id: string;
  brand: string;
  coordinator_external_id: string | null;
  coordinator_name?: string | null;
  is_default: boolean;
  address?: HubAddress | null;
}

export interface Promoter {
  external_id: string;
  name: string | null;
  phone?: string | null;
  cpf?: string | null;
}

export function listHubs(): Promise<Hub[]> {
  return requestAuth<Hub[] | Record<string, unknown>>("/api/v1/staff/hubs").then((data) =>
    Array.isArray(data) ? data : [],
  );
}

export function listPromoters(): Promise<Promoter[]> {
  return requestAuth<Promoter[] | Record<string, unknown>>("/api/v1/staff/promoters").then((data) =>
    Array.isArray(data) ? data : [],
  );
}

export interface CreateHubInput {
  brand: string;
  coordinator_external_id: string;
  address_id?: number | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  is_default?: boolean;
}

export function createHub(
  brandOrInput: string | CreateHubInput,
  coordinatorExternalId?: string | null,
  addressData?: {
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  } | null,
): Promise<Hub> {
  let body: CreateHubInput;
  if (typeof brandOrInput === "object" && brandOrInput !== null) {
    body = brandOrInput;
  } else {
    body = {
      brand: brandOrInput,
      coordinator_external_id: coordinatorExternalId || "",
      cep: addressData?.cep || null,
      street: addressData?.street || null,
      number: addressData?.number || null,
      complement: addressData?.complement || null,
      neighborhood: addressData?.neighborhood || null,
      city: addressData?.city || null,
      state: addressData?.state || null,
    };
  }
  return requestAuth<Hub>("/api/v1/staff/hubs", {
    json: body,
  });
}

export function setHubCoordinator(hubId: string, coordinatorExternalId: string): Promise<Hub> {
  return requestAuth<Hub>(`/api/v1/staff/hubs/${hubId}/coordinator`, {
    method: "PUT",
    json: { coordinator_external_id: coordinatorExternalId },
  });
}

export function setDefaultHub(hubId: string): Promise<Hub> {
  return requestAuth<Hub>(`/api/v1/staff/hubs/${hubId}/default`, { method: "PUT" });
}

export interface HubAddressIn {
  cep: string;
  number?: string | null;
  complement?: string | null;
}

export function setHubAddress(hubId: string, addr: HubAddressIn): Promise<Hub> {
  return requestAuth<Hub>(`/api/v1/staff/hubs/${hubId}/address`, {
    method: "PATCH",
    json: addr,
  });
}

/* ============================ training ============================= */
/*
 * Os endpoints de treino são UNTYPED no backend (sem response schema). O dict vem
 * de training_iface.material_to_dict(m, include_answer=True): os campos do MaterialIn
 * + external_id/active/created_at/video/photo. Tipo permissivo com index signature.
 */
export interface Material {
  external_id: string;
  title: string;
  question: string;
  expected_answer?: string | null;
  text_content?: string | null;
  content_blocks?: unknown[];
  order?: number;
  kind?: string;
  blocking?: boolean;
  ephemeral?: boolean;
  active?: boolean;
  video?: string | null;
  photo?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

/** Corpo de criação (MaterialIn). text_content/blocks/flags têm default no backend. */
export interface MaterialIn {
  title: string;
  question: string;
  expected_answer: string;
  text_content?: string;
  content_blocks?: unknown[];
  order?: number;
  kind?: string;
  blocking?: boolean;
  ephemeral?: boolean;
  video?: string | null;
  photo?: string | null;
}

/** Edição parcial (MaterialUpdateIn) — só os campos enviados; active=false desativa. */
export type MaterialUpdateIn = Partial<MaterialIn> & { active?: boolean };

export function listMaterials(): Promise<Material[]> {
  return requestAuth<Material[]>("/api/v1/staff/training/materials");
}

export function createMaterial(payload: MaterialIn): Promise<Material> {
  return requestAuth<Material>("/api/v1/staff/training/materials", { json: payload });
}

export function updateMaterial(id: string, payload: MaterialUpdateIn): Promise<Material> {
  return requestAuth<Material>(`/api/v1/staff/training/materials/${id}`, {
    method: "PUT",
    json: payload,
  });
}

export function deleteMaterial(id: string): Promise<{ deleted: string }> {
  return requestAuth<{ deleted: string }>(`/api/v1/staff/training/materials/${id}`, {
    method: "DELETE",
  });
}

export function publishMaterial(id: string): Promise<unknown> {
  return requestAuth<unknown>(`/api/v1/staff/training/materials/${id}/publish`, { method: "POST" });
}

/** Upload do vídeo da matéria (1 por matéria; campo multipart `file`). */
export function uploadMaterialVideo(id: string, file: File): Promise<Material> {
  const form = new FormData();
  form.append("file", file);
  return requestAuth<Material>(`/api/v1/staff/training/materials/${id}/video`, {
    form,
    timeoutMs: 120_000,
  });
}

/* ============================ finance ============================== */
/* Endpoints UNTYPED no backend — tipos definidos na mão do que staff.py retorna. */

/** asaas account_balance(): saldo ao vivo OU erro. Shape solto (vem do provedor). */
export interface FinanceBalance {
  balance?: number | string | null;
  error?: string | boolean | null;
  [key: string]: unknown;
}

export function getFinanceBalance(): Promise<FinanceBalance> {
  return requestAuth<FinanceBalance>("/api/v1/staff/finance/balance");
}

/** finance_iface.summary(): contagem + total por status (comissões e fila de saída). Shape solto. */
export type FinanceSummary = Record<string, unknown>;

export function getFinanceSummary(): Promise<FinanceSummary> {
  return requestAuth<FinanceSummary>("/api/v1/staff/finance/summary");
}

/** Uma comissão (shape solto — o backend devolve dict do service). */
export type Commission = Record<string, unknown>;

export function getFinanceCommissions(status?: string): Promise<Commission[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return requestAuth<Commission[]>(`/api/v1/staff/finance/commissions${q}`);
}

/** Uma solicitação de pagamento / payout (shape solto). kind = commission|fee|manual. */
export type Payout = Record<string, unknown>;

export function getFinancePayouts(opts?: { status?: string; kind?: string }): Promise<Payout[]> {
  const p = new URLSearchParams();
  if (opts?.status) p.set("status", opts.status);
  if (opts?.kind) p.set("kind", opts.kind);
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<Payout[]>(`/api/v1/staff/finance/payouts${q}`);
}

/** Resposta do POST /finance/payments. */
export interface ManualPaymentOut {
  external_id: string;
  kind: string;
  method: string;
  amount: string;
  status: string;
  external_reference: string | null;
  receipt: string | null;
}

export interface ManualPaymentInput {
  kind: "pix" | "boleto";
  amount?: string | null;
  description?: string | null;
  supplier_name?: string | null;
  /** kind=pix */
  pix_key?: string | null;
  /** kind=boleto — linha digitável */
  boleto_line?: string | null;
  receipt?: File | null;
}

/**
 * Helper to generate an Idempotency-Key UUID.
 */
function generateIdempotencyKey(key?: string): string {
  if (key && key.trim()) return key.trim();
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * PRODUÇÃO REAL: enfileira um pagamento avulso (PIX/boleto) a um terceiro livre.
 * Multipart (recibo opcional). A UI DEVE confirmar antes de chamar (move dinheiro).
 * Idempotente via header Idempotency-Key.
 */
export function createManualPayment(input: ManualPaymentInput, idempotencyKey?: string): Promise<ManualPaymentOut> {
  const form = new FormData();
  form.append("kind", input.kind);
  if (input.amount) form.append("amount", input.amount);
  if (input.description) form.append("description", input.description);
  if (input.supplier_name) form.append("supplier_name", input.supplier_name);
  if (input.pix_key) form.append("pix_key", input.pix_key);
  if (input.boleto_line) form.append("boleto_line", input.boleto_line);
  if (input.receipt) form.append("receipt", input.receipt);
  return requestAuth<ManualPaymentOut>("/api/v1/staff/finance/payments", {
    form,
    headers: {
      "Idempotency-Key": generateIdempotencyKey(idempotencyKey),
    },
    timeoutMs: 30_000,
  });
}

/** PRODUÇÃO REAL: adianta o fechamento da semana (idempotente). Confirmar antes. */
export function runClosing(idempotencyKey?: string): Promise<unknown> {
  return requestAuth<unknown>("/api/v1/staff/finance/closing/run", {
    method: "POST",
    headers: {
      "Idempotency-Key": generateIdempotencyKey(idempotencyKey),
    },
    timeoutMs: 60_000,
  });
}

/** Saúde do fechamento: saldo vs obrigação estimada. */
export interface ClosingHealth {
  obrigacao_estimada: string;
  saldo: string | null;
  suficiente: boolean | null;
  deficit: string | null;
  balance_error?: string | boolean | null;
  [key: string]: unknown;
}

export function getClosingHealth(): Promise<ClosingHealth> {
  return requestAuth<ClosingHealth>("/api/v1/staff/finance/closing/health");
}

/* ──────────────────── Ledger & Soberania do Admin ──────────────────── */

export interface CashflowOverview {
  pending_payouts_queue: string;
  unclosed_commissions_liability: string;
  month_unexpected_expenses: string;
  open_disputes_at_risk: string;
  month_accumulated_revenue: string;
  total_obligations_due: string;
  timestamp: string;
}

export function getFinanceCashflow(): Promise<CashflowOverview> {
  return requestAuth<CashflowOverview>("/api/v1/staff/finance/cashflow");
}

export interface LedgerEntry {
  external_id: string;
  transaction_external_id: string;
  account_code: string;
  account_name: string;
  entry_type: "debit" | "credit";
  amount: string;
  balance_after: string | null;
  created_at: string;
}

export function getFinanceLedger(opts?: { account_code?: string; entry_type?: string }): Promise<LedgerEntry[]> {
  const p = new URLSearchParams();
  if (opts?.account_code) p.set("account_code", opts.account_code);
  if (opts?.entry_type) p.set("entry_type", opts.entry_type);
  const q = p.toString() ? `?${p.toString()}` : "";
  return requestAuth<LedgerEntry[]>(`/api/v1/staff/finance/ledger${q}`);
}

export interface FinancialTransaction {
  external_id: string;
  kind: string;
  amount: string;
  status: string;
  description: string | null;
  source_type: string;
  source_external_id: string | null;
  idempotency_key: string;
  created_at: string;
  settled_at: string | null;
}

export function getFinanceTransactions(opts?: { kind?: string }): Promise<FinancialTransaction[]> {
  const p = new URLSearchParams();
  if (opts?.kind) p.set("kind", opts.kind);
  const q = p.toString() ? `?${p.toString()}` : "";
  return requestAuth<FinancialTransaction[]>(`/api/v1/staff/finance/transactions${q}`);
}

export interface ManualAdjustmentInput {
  account_code: string;
  entry_type: "debit" | "credit";
  amount: string;
  justification: string;
  counterpart_account_code?: string | null;
  description?: string | null;
}

export function createManualAdjustment(input: ManualAdjustmentInput): Promise<FinancialTransaction> {
  const key = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return requestAuth<FinancialTransaction>("/api/v1/staff/finance/adjustments", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    json: input,
  });
}

export interface UnexpectedExpenseInput {
  category: string;
  amount: string;
  description: string;
  justification: string;
  supplier_name?: string | null;
  method?: "pix_key" | "boleto";
  pix_key?: string | null;
  boleto_line?: string | null;
  receipt?: File | null;
}

export interface UnexpectedExpenseOut {
  external_id: string;
  transaction_external_id: string | null;
  payment_request_external_id: string | null;
  category: string;
  amount: string;
  description: string;
  justification: string;
  supplier_name: string | null;
  receipt: string | null;
  created_at: string;
}

export function createUnexpectedExpense(input: UnexpectedExpenseInput): Promise<UnexpectedExpenseOut> {
  const key = `unexp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const form = new FormData();
  form.append("category", input.category);
  form.append("amount", input.amount);
  form.append("description", input.description);
  form.append("justification", input.justification);
  if (input.supplier_name) form.append("supplier_name", input.supplier_name);
  if (input.method) form.append("method", input.method);
  if (input.pix_key) form.append("pix_key", input.pix_key);
  if (input.boleto_line) form.append("boleto_line", input.boleto_line);
  if (input.receipt) form.append("receipt", input.receipt);

  return requestAuth<UnexpectedExpenseOut>("/api/v1/staff/finance/expenses/unexpected", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    form,
  });
}

export interface DisputeRecord {
  external_id: string;
  external_dispute_id: string;
  amount: string;
  status: string;
  reason: string;
  resolution: string | null;
  justification: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function getFinanceDisputes(): Promise<DisputeRecord[]> {
  return requestAuth<DisputeRecord[]>("/api/v1/staff/finance/disputes");
}

export interface DisputeResolveInput {
  resolution: "absorb_loss" | "debit_promoter" | "contest_gateway";
  justification: string;
  correlated_commission_id?: string | null;
}

export function resolveFinanceDispute(
  externalDisputeId: string,
  input: DisputeResolveInput
): Promise<DisputeRecord> {
  return requestAuth<DisputeRecord>(`/api/v1/staff/finance/disputes/${externalDisputeId}/resolve`, {
    method: "POST",
    json: input,
  });
}

export interface FinancialAuditLogItem {
  external_id: string;
  actor_external_id: string | null;
  action: string;
  target_model: string;
  target_external_id: string | null;
  justification: string;
  snapshot_before: Record<string, unknown> | null;
  snapshot_after: Record<string, unknown> | null;
  created_at: string;
}

export function getFinanceAudit(opts?: { action?: string; target_model?: string }): Promise<FinancialAuditLogItem[]> {
  const p = new URLSearchParams();
  if (opts?.action) p.set("action", opts.action);
  if (opts?.target_model) p.set("target_model", opts.target_model);
  const q = p.toString() ? `?${p.toString()}` : "";
  return requestAuth<FinancialAuditLogItem[]>(`/api/v1/staff/finance/audit${q}`);
}


/* =========================== integrations ========================= */

/** Status/config de uma integração (shape solto — varia por integração). */
export type Integration = Record<string, unknown> & { name?: string };

export function listIntegrations(): Promise<Integration[]> {
  return requestAuth<Integration[]>("/api/v1/staff/integrations");
}

export function getIntegration(name: string): Promise<Integration> {
  return requestAuth<Integration>(`/api/v1/staff/integrations/${name}`);
}

export function setupIntegration(name: string): Promise<Integration> {
  return requestAuth<Integration>(`/api/v1/staff/integrations/${name}/setup`, {
    method: "POST",
    timeoutMs: 30_000,
  });
}

export function testIntegration(name: string): Promise<Integration> {
  return requestAuth<Integration>(`/api/v1/staff/integrations/${name}/test`, {
    method: "POST",
    timeoutMs: 30_000,
  });
}

/* ============================== system ============================ */

export interface SystemStatus {
  db_ok: boolean;
  migrations_pending: string[];
  qcluster_alive: boolean;
  qcluster_count: number;
  queued_tasks: number | null;
  debug: boolean;
  external_url: string | null;
}

export function getSystemStatus(): Promise<SystemStatus> {
  return requestAuth<SystemStatus>("/api/v1/staff/system");
}

/* =============================== logs ============================= */

export interface UnroutedEvent {
  source: string;
  event: string;
  reason: string;
  resolved: boolean;
  received_at: string;
}

export function getLogsUnrouted(opts?: { resolved?: boolean; limit?: number }): Promise<UnroutedEvent[]> {
  const p = new URLSearchParams();
  if (opts?.resolved !== undefined) p.set("resolved", String(opts.resolved));
  if (opts?.limit) p.set("limit", String(opts.limit));
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<UnroutedEvent[]>(`/api/v1/staff/logs/unrouted${q}`);
}

export interface AiCall {
  provider: string;
  model: string;
  operation: string;
  caller: string;
  status: string;
  cost: string | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export function getLogsAiCalls(opts?: { status?: string; limit?: number }): Promise<AiCall[]> {
  const p = new URLSearchParams();
  if (opts?.status) p.set("status", opts.status);
  if (opts?.limit) p.set("limit", String(opts.limit));
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<AiCall[]>(`/api/v1/staff/logs/ai-calls${q}`);
}

export interface ValidationCheck {
  scope: string;
  name: string;
  passed: boolean;
  mode: string;
  detail: string | null;
  checked_at: string;
}

export function getLogsChecks(opts?: { scope?: string; limit?: number }): Promise<ValidationCheck[]> {
  const p = new URLSearchParams();
  if (opts?.scope) p.set("scope", opts.scope);
  if (opts?.limit) p.set("limit", String(opts.limit));
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<ValidationCheck[]>(`/api/v1/staff/logs/checks${q}`);
}

/* ========================= visão global ========================== */
/* enrollments/students/leads são UNTYPED — shape solto (dict do interface). */

export type EnrollmentRow = Record<string, unknown>;
export type StudentRow = Record<string, unknown>;
export type LeadRow = Record<string, unknown>;

export function listEnrollments(opts?: { hub?: string; status?: string }): Promise<EnrollmentRow[]> {
  const p = new URLSearchParams();
  if (opts?.hub) p.set("hub", opts.hub);
  if (opts?.status) p.set("status", opts.status);
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<EnrollmentRow[]>(`/api/v1/staff/enrollments${q}`);
}

export function listStudents(opts?: { hub?: string; status?: string }): Promise<StudentRow[]> {
  const p = new URLSearchParams();
  if (opts?.hub) p.set("hub", opts.hub);
  if (opts?.status) p.set("status", opts.status);
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<StudentRow[]>(`/api/v1/staff/students${q}`);
}

export function listLeads(opts?: { hub?: string; status?: string }): Promise<LeadRow[]> {
  const p = new URLSearchParams();
  if (opts?.hub) p.set("hub", opts.hub);
  if (opts?.status) p.set("status", opts.status);
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<LeadRow[]>(`/api/v1/staff/leads${q}`);
}

export function markLeadPaid(leadId: string, idempotencyKey?: string): Promise<{ detail: string }> {
  return requestAuth<{ detail: string }>(`/api/v1/staff/leads/${leadId}/mark-paid`, {
    method: "POST",
    headers: {
      "Idempotency-Key": generateIdempotencyKey(idempotencyKey),
    },
  });
}

/* ============================== users ============================= */

export interface PlatformUser {
  external_id: string;
  name: string | null;
  cpf: string | null;
  phone: string | null;
  is_superuser: boolean;
  roles: string[];
}

export function listUsers(opts?: { role?: string; limit?: number }): Promise<PlatformUser[]> {
  const p = new URLSearchParams();
  if (opts?.role) p.set("role", opts.role);
  if (opts?.limit) p.set("limit", String(opts.limit));
  const q = p.toString() ? `?${p}` : "";
  return requestAuth<PlatformUser[]>(`/api/v1/staff/users${q}`);
}

/** RESGATE DE LOGIN: troca o telefone (canal do OTP) de um usuário trancado fora. */
export function setUserPhone(userId: string, phone: string): Promise<unknown> {
  return requestAuth<unknown>(`/api/v1/staff/users/${userId}/phone`, {
    method: "PUT",
    json: { phone },
  });
}

export interface PlatformCredentialsIn {
  platform_login: string;
  platform_password: string;
  platform_url?: string | null;
  platform_notes?: string | null;
}

/** SÓ staff corrige login/senha da plataforma de um aluno já concluído. */
export function setStudentPlatformCredentials(
  studentId: string,
  creds: PlatformCredentialsIn,
): Promise<{ external_id: string; status: string }> {
  return requestAuth<{ external_id: string; status: string }>(
    `/api/v1/staff/students/${studentId}/platform-credentials`,
    { method: "PUT", json: creds },
  );
}

/* ============================ notify ============================== */

export interface NotifyTriggerOut {
  fires_on: string;
  source: string | null;
  delay_minutes: number;
  active: boolean;
}

export interface NotifyTemplateOut {
  event: string;
  external_id: string;
  title: string | null;
  subject: string | null;
  body_md: string;
  is_tts: boolean;
  channels: string;
  media_url: string | null;
  media_type: string | null;
  mail_template: string;
  notes: string | null;
  updated_at: string;
  trigger: NotifyTriggerOut | null;
}

export interface NotifyStatsOut {
  total: number;
  active: number;
  inactive: number;
  with_tts: number;
  with_media: number;
  by_channel: Record<string, number>;
}

export interface NotifyEventOut {
  event: string;
  has_template: boolean;
  has_in_memory: boolean;
  active: boolean | null;
}

export interface NotifyPreviewOut {
  event: string;
  body_md: string;
  rendered: string;
  is_tts: boolean;
  channels: string[];
}

export interface NotifyAiAssistIn {
  text: string;
  action: "improve" | "simplify" | "shorten" | "fix" | "persuade" | "custom";
  custom_prompt?: string;
}

export interface NotifyAiAssistOut {
  text: string;
  action: string;
}

export interface NotifyNotificationOut {
  external_id: string;
  caller: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  title: string | null;
  subject: string | null;
  text: string;
  want_whatsapp: boolean;
  want_email: boolean;
  want_tts: boolean;
  whatsapp_status: string | null;
  email_status: string | null;
  tts_status: string | null;
  whatsapp_error: string | null;
  email_error: string | null;
  tts_error: string | null;
  attempts: number;
  created_at: string;
}

export function notifyListTemplates(): Promise<NotifyTemplateOut[]> {
  return requestAuth<NotifyTemplateOut[]>("/api/v1/staff/notify/templates");
}

export function notifyGetTemplate(event: string): Promise<NotifyTemplateOut> {
  return requestAuth<NotifyTemplateOut>(`/api/v1/staff/notify/templates/${encodeURIComponent(event)}`);
}

export function notifyPatchTemplate(
  event: string,
  data: Partial<{
    title: string | null;
    subject: string | null;
    body_md: string;
    is_tts: boolean;
    channels: string;
    media_url: string | null;
    media_type: string | null;
    mail_template: string;
    notes: string | null;
  }>,
): Promise<NotifyTemplateOut> {
  return requestAuth<NotifyTemplateOut>(
    `/api/v1/staff/notify/templates/${encodeURIComponent(event)}`,
    { method: "PATCH", json: data },
  );
}

export function notifyAiAssist(payload: NotifyAiAssistIn): Promise<NotifyAiAssistOut> {
  return requestAuth<NotifyAiAssistOut>(
    "/api/v1/staff/notify/templates/ai-assist",
    { method: "POST", json: payload },
  );
}

export function notifyRestoreSeed(event: string): Promise<NotifyTemplateOut> {
  return requestAuth<NotifyTemplateOut>(
    `/api/v1/staff/notify/templates/${encodeURIComponent(event)}/restore-seed`,
    { method: "POST" },
  );
}

export function notifyPreview(
  event: string,
  ctx?: Record<string, string>,
): Promise<NotifyPreviewOut> {
  return requestAuth<NotifyPreviewOut>(
    `/api/v1/staff/notify/templates/${encodeURIComponent(event)}/preview`,
    { method: "POST", json: { ctx: ctx ?? {} } },
  );
}

export function notifyTest(
  event: string,
  channels?: string[],
  ctx?: Record<string, string>,
): Promise<{ external_id: string }> {
  return requestAuth<{ external_id: string }>(
    `/api/v1/staff/notify/templates/${encodeURIComponent(event)}/test`,
    { method: "POST", json: { channels: channels ?? null, ctx: ctx ?? {} } },
  );
}

export function notifyStats(): Promise<NotifyStatsOut> {
  return requestAuth<NotifyStatsOut>("/api/v1/staff/notify/templates/stats");
}

export function notifyListEvents(): Promise<NotifyEventOut[]> {
  return requestAuth<NotifyEventOut[]>("/api/v1/staff/notify/events");
}

export interface NotifyTtsOption {
  model: string;
  voice_female: string;
  voice_male: string;
}

export interface NotifyTtsConfigOut {
  omniroute_url: string;
  chain: NotifyTtsOption[];
  cross_gender_rule: string;
}

export interface NotifyTtsProbeIn {
  text: string;
  gender?: string | null;
  voice_override?: string | null;
}

export interface NotifyTtsProbeOut {
  ok: boolean;
  audio_url: string | null;
  gender_target: string;
  voice_used: string;
  omniroute_url: string;
  chain_results: Array<{
    model: string;
    voice: string;
    gender_target: string;
    ok: boolean;
    bytes?: number;
    error?: string;
  }>;
}

export function notifyTtsConfig(): Promise<NotifyTtsConfigOut> {
  return requestAuth<NotifyTtsConfigOut>("/api/v1/staff/notify/tts/config");
}

export function notifyTtsProbe(payload: NotifyTtsProbeIn): Promise<NotifyTtsProbeOut> {
  return requestAuth<NotifyTtsProbeOut>("/api/v1/staff/notify/tts/probe", {
    method: "POST",
    json: payload,
  });
}

export function notifyHistory(limit = 50): Promise<NotifyNotificationOut[]> {
  return requestAuth<NotifyNotificationOut[]>(
    `/api/v1/staff/notify/history?limit=${limit}`,
  );
}

/* ========================= coordinators =========================== */

export interface CoordinatedHub {
  external_id: string;
  brand: string;
  is_default: boolean;
  zipcode: string | null;
  city: string | null;
  state: string | null;
  street: string | null;
  promoters_count: number;
  students_count: number;
}

export interface Coordinator {
  external_id: string;
  name: string | null;
  cpf: string | null;
  phone: string | null;
  hubs: CoordinatedHub[];
  hubs_count: number;
  promoters_count: number;
  students_count: number;
  total_commission: string;
  pending_commission: string;
}

export function listCoordinators(): Promise<Coordinator[]> {
  return requestAuth<Coordinator[]>("/api/v1/staff/coordinators");
}

/* ==================== platform setup & config ==================== */

export interface PlatformBossConfig {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  pix_key: string;
  default_brand: string;
  is_configured: boolean;
  external_id: string | null;
}

export interface PlatformPricingConfig {
  price_pix: string;
  price_card_cents: number;
  price_card_reais: string;
  promo_price_pix: string;
  promo_price_card_cents: number;
  promo_price_card_reais: string;
  promoter_student_min_leads: number;
  promoter_student_target_leads: number;
  card_installments: number;
  description: string;
}

export interface PlatformCommissionsConfig {
  commission_direct: string;
  commission_bonus_flat: string;
  commission_bonus_threshold: number;
  commission_coordinator: string;
  commission_closing_weekday: number;
  commission_closing_hour: number;
}

export interface PlatformIntegrationItem {
  value: string;
  configured: boolean;
  is_secret: boolean;
}

export interface PlatformSetup {
  boss: PlatformBossConfig;
  pricing: PlatformPricingConfig;
  commissions: PlatformCommissionsConfig;
  integrations: Record<string, PlatformIntegrationItem>;
}

export interface PlatformSetupIn {
  boss?: Partial<PlatformBossConfig>;
  pricing?: Partial<PlatformPricingConfig>;
  commissions?: Partial<PlatformCommissionsConfig>;
  integrations?: Record<string, string>;
}

export function getPlatformSetup(): Promise<PlatformSetup> {
  return requestAuth<PlatformSetup>("/api/v1/staff/config/setup");
}

export function updatePlatformSetup(payload: PlatformSetupIn): Promise<PlatformSetup> {
  return requestAuth<PlatformSetup>("/api/v1/staff/config/setup", {
    method: "PUT",
    json: payload,
  });
}

export interface SeedRunResult {
  success: boolean;
  output: string;
  config: PlatformSetup;
}

export function runBootstrapSeed(): Promise<SeedRunResult> {
  return requestAuth<SeedRunResult>("/api/v1/staff/config/seed-run", {
    method: "POST",
    timeoutMs: 60_000,
  });
}

export interface LiveTestResult {
  name: string;
  success: boolean;
  latency_ms: number;
  details: Record<string, unknown>;
  error: string | null;
}

export function testIntegrationLive(name: string): Promise<LiveTestResult> {
  return requestAuth<LiveTestResult>(`/api/v1/staff/integrations/${name}/test-live`, {
    method: "POST",
    timeoutMs: 30_000,
  });
}

export interface BootstrapStatusResponse {
  bootstrapped: boolean;
  setup_required: boolean;
}

export function getBootstrapStatus(): Promise<BootstrapStatusResponse> {
  return request<BootstrapStatusResponse>("/api/v1/staff/bootstrap/status");
}

export interface BootstrapInitPayload {
  boss: {
    name?: string;
    cpf?: string;
    phone?: string;
    email?: string;
    pix_key?: string;
    default_brand?: string;
    password?: string;
  };
  pricing?: {
    price_pix?: string;
    price_card_cents?: number;
    promo_price_pix?: string;
    promo_price_card_cents?: number;
    promoter_student_min_leads?: number;
    promoter_student_target_leads?: number;
    card_installments?: number;
    description?: string;
  };
  commissions?: {
    commission_direct?: string;
    commission_bonus_flat?: string;
    commission_bonus_threshold?: number;
    commission_coordinator?: string;
    commission_closing_weekday?: number;
    commission_closing_hour?: number;
  };
  integrations?: Record<string, string>;
}

export interface BootstrapInitResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_external_id: string;
}

export function initPlatformBootstrap(payload: BootstrapInitPayload): Promise<BootstrapInitResponse> {
  return request<BootstrapInitResponse>("/api/v1/staff/bootstrap/init", {
    method: "POST",
    json: payload,
    timeoutMs: 60_000,
  });
}

/* ============================ new advanced APIs ============================= */

export interface ClosingSimulationBeneficiary {
  user_external_id: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  role: string;
  amount: string;
  leads_count: number;
  bonus_earned: boolean;
  pix_key: string | null;
  has_pix: boolean;
}

export interface ClosingSimulation {
  week_of: string;
  friday: string;
  total_obligation: string;
  commissions_count: number;
  bonuses_count: number;
  beneficiaries_count: number;
  awaiting_pix_count: number;
  bonus_threshold: number;
  bonus_amount: string;
  beneficiaries: ClosingSimulationBeneficiary[];
}

export function getClosingSimulation(): Promise<ClosingSimulation> {
  return requestAuth<ClosingSimulation>("/api/v1/staff/finance/closing/simulation");
}

export function retryPayout(externalId: string, idempotencyKey?: string): Promise<{ external_id: string; status: string }> {
  return requestAuth<{ external_id: string; status: string }>(`/api/v1/staff/finance/payouts/${externalId}/retry`, {
    method: "POST",
    headers: {
      "Idempotency-Key": generateIdempotencyKey(idempotencyKey),
    },
  });
}

export function overridePayoutPix(externalId: string, pixKey: string, updateProfile = true, idempotencyKey?: string): Promise<{ external_id: string; status: string; pix_key: string }> {
  const form = new FormData();
  form.append("pix_key", pixKey);
  form.append("update_profile", String(updateProfile));
  return requestAuth<{ external_id: string; status: string; pix_key: string }>(`/api/v1/staff/finance/payouts/${externalId}/override-pix`, {
    method: "POST",
    form,
    headers: {
      "Idempotency-Key": generateIdempotencyKey(idempotencyKey),
    },
  });
}

export interface DocumentReviewItem {
  external_id: string;
  user_external_id: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  hub_name: string | null;
  type: string;
  kind: string;
  reason: string;
  created_at: string;
}

export function getGlobalDocumentReviews(hub?: string, docType?: string): Promise<DocumentReviewItem[]> {
  const params = new URLSearchParams();
  if (hub) params.set("hub", hub);
  if (docType) params.set("doc_type", docType);
  const q = params.toString() ? `?${params.toString()}` : "";
  return requestAuth<DocumentReviewItem[]>(`/api/v1/staff/documents/reviews${q}`);
}

export interface UserDossier {
  user_external_id: string;
  profile: {
    name: string | null;
    cpf: string | null;
    phone: string | null;
    email: string | null;
    birth_date: string | null;
    mother_name: string | null;
    father_name: string | null;
    pix_key: string | null;
    selfie_needs_meeting: boolean;
  };
  media: {
    front_photo: string | null;
    back_photo: string | null;
    full_photo: string | null;
    selfie_photo: string | null;
    face_crop: string | null;
    address_photo: string | null;
  };
  document_data: {
    doc_type: string | null;
    number: string | null;
    state: string | null;
    validation_status: string | null;
    validation_reason: string | null;
    extracted_data: Record<string, unknown>;
  };
  biometrics: {
    selfie_status: string | null;
    selfie_reason: string | null;
    verifications: Array<{ score: string | number; status: string; approved: boolean; created_at: string }>;
  };
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
  };
}

export function getUserDossier(userExternalId: string): Promise<UserDossier> {
  return requestAuth<UserDossier>(`/api/v1/staff/documents/${userExternalId}/dossier`);
}

export function decideDocumentStaff(
  userExternalId: string,
  payload: { kind: string; approve: boolean; reason?: string; doc_id?: string }
): Promise<{ detail: string; status: string }> {
  return requestAuth<{ detail: string; status: string }>(`/api/v1/staff/documents/${userExternalId}/decide`, {
    method: "POST",
    json: payload,
  });
}

export interface NetworkPromoter {
  external_id: string;
  user_external_id: string;
  name: string;
  phone: string | null;
  status: string;
  leads_count: number;
  paid_count: number;
  students_count: number;
  conversion_rate: number;
}

export interface NetworkHubNode {
  hub_external_id: string;
  brand: string;
  is_default: boolean;
  coordinator: {
    user_external_id: string | null;
    name: string;
    phone: string | null;
  };
  metrics: {
    total_promoters: number;
    total_leads: number;
    total_paid: number;
    conversion_rate: number;
  };
  promoters: NetworkPromoter[];
}

export function getNetworkTree(hub?: string): Promise<NetworkHubNode[]> {
  const q = hub ? `?hub=${hub}` : "";
  return requestAuth<NetworkHubNode[]>(`/api/v1/staff/network/tree${q}`);
}

export interface TrainingSubmissionItem {
  external_id: string;
  user_external_id: string;
  user_name: string;
  user_phone: string | null;
  material_title: string;
  material_question: string;
  material_expected: string;
  answer: string;
  audio_url: string | null;
  grade: string | null;
  justification: string | null;
  status: string;
  created_at: string;
}

export function getTrainingSubmissions(status?: string, materialId?: string): Promise<TrainingSubmissionItem[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (materialId) params.set("material_id", materialId);
  const q = params.toString() ? `?${params.toString()}` : "";
  return requestAuth<TrainingSubmissionItem[]>(`/api/v1/staff/training/submissions${q}`);
}

export function overrideSubmissionGrade(
  externalId: string,
  grade: string,
  approve: boolean,
  justification?: string
): Promise<{ detail: string; status: string }> {
  const params = new URLSearchParams({ grade, approve: String(approve) });
  if (justification) params.set("justification", justification);
  return requestAuth<{ detail: string; status: string }>(`/api/v1/staff/training/submissions/${externalId}/override?${params.toString()}`, {
    method: "POST",
  });
}

export function unlockPromoterTraining(promoterExternalId: string): Promise<{ detail: string }> {
  return requestAuth<{ detail: string }>(`/api/v1/staff/training/promoters/${promoterExternalId}/unlock`, {
    method: "POST",
  });
}

