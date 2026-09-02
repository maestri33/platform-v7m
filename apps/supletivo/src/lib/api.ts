import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/config";
import type { Pricing } from "@/lib/payment";
import { clearSession, getAccessToken, getRefreshToken, saveLogin } from "@/lib/session";

/* ============================== errors ============================== */

export class ApiError extends Error {
  readonly status: number;
  /** Section the enrollment state machine expects (from `expected_status`). */
  readonly expectedStatus?: string;
  /** Machine-readable error code (e.g. EDUCATION_GRADE_OUT_OF_RANGE), from `code`. */
  readonly code?: string;
  /** Structured error context (e.g. { min, max } for range errors), from `extra`. */
  readonly extra?: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    expectedStatus?: string,
    code?: string,
    extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.expectedStatus = expectedStatus;
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

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  json?: unknown;
  file?: File;
  token?: string;
  timeoutMs?: number;
}

/**
 * Retenta quando a conexão morre ANTES de virar resposta (`fetch` rejeita com TypeError).
 * O caso real: keep-alive ocioso que a borda já fechou e o browser reusa — o Chrome refaz
 * GET sozinho, mas nunca POST, então só os passos do funil quebravam (E2E 2026-07-28:
 * `/auth/check`, `/lead/identity` e `/auth/login` caindo em "Cadê a internet?" com o
 * request nem chegando no Caddy). Timeout (AbortError) NÃO entra aqui: ali o servidor
 * pode ter recebido, e repetir arriscaria cobrar/criar duas vezes.
 *
 * DUAS retentativas, com respiro entre elas: a primeira, imediata, ainda pegava o mesmo
 * socket morto do pool e falhava junto (observado no E2E — as duas tentativas morreram no
 * mesmo instante). O intervalo dá tempo de o browser aposentar a conexão e abrir outra.
 */
const RETRY_DELAYS_MS = [250, 900];

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await requestOnce<T>(path, opts);
    } catch (err) {
      // Só conexão morta (TypeError do fetch); ApiError e AbortError sobem na hora.
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
    const headers: Record<string, string> = { Accept: "application/json" };
    let body: BodyInit | undefined;
    if (opts.file) {
      const form = new FormData();
      form.append("file", opts.file);
      body = form;
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
      expected_status?: string;
      code?: string;
      extra?: Record<string, unknown>;
    } | null;
    if (!res.ok) {
      throw new ApiError(
        data?.detail ?? `Erro ${res.status}`,
        res.status,
        data?.expected_status,
        data?.code,
        data?.extra,
      );
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
    refreshPromise = request<LoginResponse>("/api/v1/clients/auth/refresh", {
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
 * once (POST /auth/refresh) and retries. If refresh also fails, the session is
 * cleared so guards send the user back to the funnel start.
 * Single-flight mutex eliminates concurrent 401 refresh race conditions.
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

/** Response shape of POST /api/v1/clients/auth/check (phone variant). */
export interface CheckResponse {
  found: boolean;
  external_id: string | null;
  otp_sent: boolean;
  /** Seconds to wait before a new OTP can be sent (cooldown). null when not waiting. */
  otp_wait: number | null;
  whatsapp: boolean | null;
  roles: string[] | null;
  /**
   * Lead funnel v2: the check itself CREATES the account when the number is new and has
   * WhatsApp. `found` stays honest (false), so callers must treat `found || created` as
   * "this user exists now, go to the OTP screen".
   */
  created: boolean;
}

/** Roles that may enter the client app. Anyone without one is staff-only -> blocked. */
export const CLIENT_ROLES = ["lead", "enrollment", "student", "veteran"] as const;

export function isClient(roles: string[] | null | undefined): boolean {
  if (!roles) return false;
  return roles.some((r) => (CLIENT_ROLES as readonly string[]).includes(r));
}

/**
 * Check a phone against the client pipeline. `phone` must be digits-only (10/11).
 *
 * `ref` is the referring promoter's external_id (`?ref=` on the landing). The backend only
 * reads it on the branch that CREATES the account; on an existing user it is ignored, so it
 * is always safe to pass through.
 */
export function checkPhone(phone: string, ref?: string): Promise<CheckResponse> {
  const json: { phone: string; ref?: string } = { phone };
  if (ref) json.ref = ref;
  return request<CheckResponse>("/api/v1/clients/auth/check", { json });
}

/**
 * Display name behind a `?ref=` (the "Indicado por …" badge). Public and deliberately thin:
 * only the promoter's first name. Always 200 — a ref that does not resolve comes back
 * `{ name: null }` and the badge is simply not drawn.
 */
export function getReferralName(ref: string): Promise<{ name: string | null }> {
  return request<{ name: string | null }>(
    `/api/v1/clients/referral/${encodeURIComponent(ref)}`,
  );
}

/** Response of POST /auth/login and /auth/refresh (TokenOut). JWT bearer pair. */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** Verify the OTP for a known client. Flat body {external_id, otp}. */
export function loginOtp(externalId: string, otp: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/clients/auth/login", {
    json: { external_id: externalId, otp },
  });
}

/** Affiliate refs are promoter external_ids — only a UUID is worth sending. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export interface RegisterInput {
  phone: string;
  email: string;
  cpf: string;
  ref?: string | null;
  paymentMethod?: string | null;
}

/** CheckoutOut — payment created alongside the lead (checkout when unpaid, receipt when paid). */
export interface CheckoutOut {
  payment_method: string;
  provider: string;
  amount: string;
  is_paid: boolean;
  checkout_url?: string | null;
  short_url?: string | null;
  receipt_url?: string | null;
  url?: string | null;
  qrcode_payload?: string | null;
  qrcode_image?: string | null;
  due_date?: string | null;
}

/** 201 LeadOut — register creates the lead AND its checkout in one shot. */
export interface RegisterResponse {
  /** external_id of the LEAD (≠ user — proposta #8). Used for lead-scoped reads, NOT login. */
  external_id: string;
  /** external_id of the USER — THIS is the id POST /auth/login expects (not the lead id). */
  user_external_id: string;
  status: string;
  checkout?: CheckoutOut | null;
}

/**
 * Register a new lead. Flat body {phone,email,cpf,ref?,payment_method?}.
 * Every client enters the pipeline as a lead. `ref` is sent only when it is a
 * valid promoter UUID. Register dispatches OTP + creates the checkout — allow longer.
 */
export function registerLead(input: RegisterInput): Promise<RegisterResponse> {
  const body: Record<string, string> = {
    phone: input.phone,
    email: input.email,
    cpf: input.cpf,
  };
  if (input.ref && isUuid(input.ref)) body.ref = input.ref;
  if (input.paymentMethod) body.payment_method = input.paymentMethod;
  return request<RegisterResponse>("/api/v1/clients/auth/register", {
    json: body,
    timeoutMs: 30_000,
  });
}

/* ========================= authenticated =========================== */

/** WhoamiOut — identity of the authenticated client. */
export interface WhoAmI {
  external_id: string;
  roles: string[];
  name?: string | null;
}

export function whoami(): Promise<WhoAmI> {
  return requestAuth<WhoAmI>("/api/v1/clients/whoami");
}

/**
 * Contrato de matrícula VERSIONADO — fonte da verdade no backend (`users/consent`). O texto
 * exibido tem que ser o mesmo que a selfie assina: a selfie grava `version`+`hash` no aceite,
 * então um texto hardcoded no front seria uma assinatura em cima de outro documento.
 */
export interface Contract {
  version: string;
  hash: string;
  text: string;
}

export function getContract(): Promise<Contract> {
  return requestAuth<Contract>("/api/v1/clients/contract/current");
}

/** LeadMeOut — all data known about the lead (customer, promoter, checkout/receipt). */
export interface LeadMe {
  external_id: string;
  status: string;
  failed_reason?: string | null;
  created_at: string;
  customer: { name?: string | null; phone?: string | null; email?: string | null; cpf?: string | null };
  promoter: Record<string, unknown>;
  checkout?: CheckoutOut | null;
}

export function getLeadMe(): Promise<LeadMe> {
  return requestAuth<LeadMe>("/api/v1/clients/lead/me");
}

/** UrlOut — single lead link (checkout when unpaid, receipt when paid). */
export function getLeadCheckoutUrl(): Promise<{ url: string }> {
  return requestAuth<{ url: string }>("/api/v1/clients/lead/checkout-url");
}

/** IdentityOut — passo 3 do funil v2: o CPF confirmado e a identidade do pergaminho. */
export interface IdentityOut {
  cpf: string;
  name: string | null;
  /** ISO YYYY-MM-DD — quem calcula a idade é o front. */
  birth_date: string | null;
  /** "M" | "F" — o backend manda; hoje o selo é neutro e não consome. */
  sex: string | null;
  /**
   * Foto de perfil do WhatsApp, capturada em task async quando a conta nasce no passo 1.
   * Sem foto no zap → null e o pergaminho desenha o monograma; nunca é erro. NÃO é prova
   * de identidade — é ilustração (o CPFHub, que é a autoridade, não entrega foto).
   */
  photo: string | null;
}

/**
 * Passo 3: confirma o CPF e devolve a identidade. Erros que a tela trata (ver `lead-api.ts`):
 * 422 `CPF_INVALID`/`CPF_NOT_FOUND` · 409 `CPF_CONFLICT` (o backend APAGA a conta desta
 * tentativa e avisa o titular) · 409 `CPF_ALREADY_SET` · 502 `CPF_SERVICE_DOWN`.
 */
export function confirmIdentity(cpf: string): Promise<IdentityOut> {
  return requestAuth<IdentityOut>("/api/v1/clients/lead/identity", { json: { cpf } });
}

/** EmailOut — passo 5 do funil v2: o e-mail gravado (normalizado pelo backend). */
export interface EmailOut {
  email: string;
  /**
   * `true` = este e-mail JÁ era o desta conta (chamada idempotente). O front troca a
   * celebração: novo → "Excelente!"; o próprio → "Perfeito, já é o seu e-mail".
   */
  already_yours: boolean;
}

/**
 * Passo 5: grava o e-mail de contato. Erros que a tela trata (ver `lead-api.ts`):
 * 409 `EMAIL_CONFLICT` (e-mail de OUTRA conta → estado-escudo inline) · 422 `EMAIL_INVALID`.
 */
export function setLeadEmail(email: string): Promise<EmailOut> {
  return requestAuth<EmailOut>("/api/v1/clients/lead/email", { json: { email } });
}

/**
 * Vitrine pública de preços (GET /pricing) — os cards do passo 6 desenham isto.
 * Rota sem auth; irmã client-side do `getPricing` server-only de pricing-server.ts.
 */
export function fetchPricing(): Promise<Pricing> {
  return request<Pricing>("/api/v1/clients/pricing");
}

/**
 * Passo 6: define (ou TROCA) a forma de pagamento e cria o checkout. Trocar recria a
 * sessão no backend (o link antigo morre). Erros que a tela trata (ver `lead-api.ts`):
 * 409 `ALREADY_PAID` · 409 `PROFILE_INCOMPLETE` (+`missing_fields`). A URL do gateway
 * pode nascer async — quando vier null, o front acompanha por `GET /lead/me`.
 * Criação fala com o Asaas → timeout folgado, como o register de antes.
 */
export function setLeadCheckout(paymentMethod: string): Promise<CheckoutOut> {
  return requestAuth<CheckoutOut>("/api/v1/clients/lead/checkout", {
    json: { payment_method: paymentMethod },
    timeoutMs: 30_000,
  });
}

/* --------------------------- student (pós-liberação) --------------- */

/** Acesso à plataforma parceira entregue ao aluno quando a matrícula conclui. */
export interface StudentPlatform {
  url?: string | null;
  login?: string | null;
  password?: string | null;
  notes?: string | null;
}

/** Tipos de documento que o aluno envia após virar student. */
export type DocumentType =
  | "certificate" // certificado de conclusão
  | "transcript" // histórico escolar
  | "address_proof" // comprovante de endereço
  | "id_card" // RG ou CNH
  | "birth_certificate" // certidão
  | "military"; // certificado de reservista (condicional)

/** Tipo sanguíneo — 8 valores do sistema ABO+Rh. */
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

/**
 * Estados do aluno na Fase 3+ (após matrícula concluída). Funil completo
 * student→veteran (fonte da verdade: api/clients.py StudentMeOut.status).
 * `blood_type_pending` é da fase de documentos (consumido por /aluno).
 */
export type StudentStatus =
  | "awaiting_documents"
  | "documents_under_review"
  | "blood_type_pending"
  | "exam_released"
  | "exam_scheduled"
  | "exam_failed"
  | "awaiting_documentation_dispatch"
  | "pending"
  | "awaiting_diploma_issuance"
  | "awaiting_pickup"
  | "veteran";

/** Friendly labels for the document type — used in card titles and sheets. */
export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  certificate: "Certificado de conclusão",
  transcript: "Histórico escolar",
  address_proof: "Comprovante de endereço",
  id_card: "RG ou CNH",
  birth_certificate: "Certidão de nascimento/casamento",
  military: "Certificado de reservista",
};

/** Hint copy shown under the FileUpload, per document type. */
export const DOCUMENT_HINT: Record<DocumentType, string> = {
  certificate: "Foto do certificado de conclusão (frente inteira, sem cortar).",
  transcript: "Histórico escolar completo, com carimbo da escola visível.",
  address_proof: "Conta de luz, água ou internet dos últimos 3 meses.",
  id_card: "Foto do RG ou CNH, aberta na página da foto.",
  birth_certificate: "Certidão de nascimento ou casamento (legível).",
  military: "Certificado de reservista (frente).",
};

/**
 * Estado de um documento individual. `applies=false` significa que o tipo não
 * se aplica ao aluno (ex.: military em mulher) — a UI renderiza um card
 * neutro e não conta como pendência. `validation_status` é null enquanto o
 * aluno não enviou nada; depois segue o mesmo ciclo da matrícula
 * (pending/approved/rejected/review).
 */
export interface StudentDocument {
  type: DocumentType;
  applies: boolean;
  required: boolean;
  uploaded_at: string | null;
  validation_status: ValidationStatus | null;
  analysis_reason: string | null;
  photo_url: string | null;
  /** Echo do ack — presente no POST e em respostas com polling ativo. */
  poll_after_ms?: number | null;
  expires_at?: string | null;
}

/** PendencyOut — uma pendência aberta pelo coordenador (documento OU taxa). */
export interface StudentPendency {
  /** external_id da PENDÊNCIA (≠ do aluno). */
  external_id: string;
  /** "document" | "fee" | etc. — texto livre vindo do back. */
  kind: string;
  description?: string | null;
  /** Valor em centavos quando a pendência é de taxa; null para documento. */
  amount_cents?: number | null;
  /** Presente no /student/me (StudentPendencyOut); ausente no GET /pendencies (open_only). */
  resolved?: boolean;
}

/** StudentDiplomaOut — estado do diploma do aluno (emitido pelo coordenador, retirado pelo aluno). */
export interface StudentDiploma {
  issued_at?: string | null;
  picked_up: boolean;
}

/** Echo canônico do /student/me — carrega documents + blood_type + pendências + diploma. */
export interface StudentMe {
  external_id?: string;
  name?: string | null;
  status?: string | null;
  platform?: StudentPlatform | null;
  documents?: StudentDocument[];
  blood_type?: BloodType | null;
  pendencies?: StudentPendency[];
  diploma?: StudentDiploma | null;
}

export function getStudentMe(): Promise<StudentMe> {
  return requestAuth<StudentMe>("/api/v1/clients/student/me");
}

/* POST /students/documents/{type} — multipart, ack de polling. */
export function postStudentDocument(
  type: DocumentType,
  file: File,
): Promise<AnalysisAck> {
  return requestAuth<AnalysisAck>(`/api/v1/clients/student/documents/${type}`, {
    file,
    timeoutMs: 60_000,
  });
}

/* POST /students/blood-type — JSON, retorna o StudentMe canônico. */
export function postStudentBloodType(bloodType: BloodType): Promise<StudentMe> {
  return requestAuth<StudentMe>("/api/v1/clients/student/blood-type", {
    json: { blood_type: bloodType },
  });
}

/** Lê o status de validação — alias pra `validation_status` (mantém simetria com `rgAnalysisStatus`). */
export function docValidationStatus(d: StudentDocument): ValidationStatus | null {
  return d.validation_status ?? null;
}

export function docValidationReason(d: StudentDocument): string | null {
  return d.analysis_reason ?? null;
}

/** Closure pronta pra `pollUntil(getStudentMe, isDocSettled(type))`. */
export function isDocSettled(
  type: DocumentType,
): (m: StudentMe) => boolean {
  return (m) => {
    const status = m.documents?.find((d) => d.type === type)?.validation_status ?? null;
    return ["approved", "rejected", "review"].includes(status ?? "");
  };
}

/* --------------------------- student: prova ------------------------ */

/** Corpo de POST /student/exam/schedule (ExamScheduleIn). `scheduled_at` é ISO 8601. */
export interface ExamScheduleInput {
  subject: string;
  /** ISO 8601 com offset (ex.: 2026-06-10T14:00:00-03:00). */
  scheduled_at: string;
}

/**
 * Agenda a prova do aluno (exam_released | exam_failed → exam_scheduled). Devolve
 * o StudentMe canônico. Erros de fase sobem como ApiError(WRONG_STATUS) com
 * `expected_status`; SUBJECT_REQUIRED / INVALID_SCHEDULED_AT viram inline.
 */
export function postStudentExamSchedule(input: ExamScheduleInput): Promise<StudentMe> {
  return requestAuth<StudentMe>("/api/v1/clients/student/exam/schedule", {
    json: { subject: input.subject, scheduled_at: input.scheduled_at },
  });
}

/* --------------------------- student: pendências ------------------- */

/** Pendências em aberto do aluno (GET /student/pendencies — open_only). */
export function getStudentPendencies(): Promise<StudentPendency[]> {
  return requestAuth<StudentPendency[]>("/api/v1/clients/student/pendencies");
}

/* --------------------------- veteran (visão final) ----------------- */
/*
 * Fluxo do diploma INVERTIDO (Victor 2026-06-30): o ALUNO não posta nada sobre o diploma — quem
 * emite, entrega e registra a retirada (foto inclusive) é o COORDENADOR. `awaiting_pickup` virou só
 * uma espera; o coordenador avança para `veteran`. A visão final READ-ONLY vem do GET /veteran/me.
 */

/**
 * Prefixa um path de mídia RELATIVO do backend com `/media/` (mesma origem — o next.config faz o
 * rewrite `/media/*` → upstream Django). null-safe e idempotente (não duplica quando já vier
 * absoluto ou já prefixado).
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/media/")) {
    return path;
  }
  return `/media/${path.replace(/^\/+/, "")}`;
}

/** Documento que o ALUNO postou — com o path da foto (o veterano acessa o arquivo via mediaUrl). */
export interface VeteranDocument {
  doc_type: string;
  validation_status: string | null;
  /** Path RELATIVO da foto — passe por mediaUrl(). */
  photo: string | null;
  validated_at: string | null;
}

/** Bloco da MATRÍCULA embutido na visão do veterano (reusa os tipos do enrollment). */
export interface VeteranEnrollment {
  profile: EnrollmentProfile | null;
  address: AddressOut | null;
  education: EducationOut | null;
  rg: RgBrief | null;
  selfie: SelfieOut | null;
}

/** Diploma RICO postado pelo COORDENADOR (diploma + histórico + foto da retirada). Paths RELATIVOS. */
export interface VeteranDiploma {
  issued_at: string | null;
  picked_up_at: string | null;
  /** PDF do diploma (path relativo → mediaUrl). */
  diploma_file: string | null;
  /** PDF do histórico escolar (path relativo → mediaUrl). */
  transcript_file: string | null;
  /** Foto da retirada, postada pelo COORDENADOR (path relativo → mediaUrl). */
  pickup_photo: string | null;
}

/**
 * GET /veteran/me — visão consolidada READ-ONLY do veterano: dados pessoais, bloco da matrícula
 * (perfil/endereço/escolaridade/RG/selfie), os documentos que o ALUNO postou e o que o COORDENADOR
 * postou (diploma/histórico/foto da retirada). O veterano mantém a role student ativa. O backend
 * devolve paths de mídia RELATIVOS — passe-os por mediaUrl() antes de renderizar.
 */
export interface VeteranMe {
  external_id?: string;
  status?: string | null;
  hub_external_id?: string;
  blood_type?: BloodType | null;
  platform?: StudentPlatform | null;
  pendencies?: StudentPendency[];
  user: {
    external_id: string;
    name: string | null;
    cpf: string | null;
    phone: string | null;
    email: string | null;
  };
  documents: VeteranDocument[];
  enrollment: VeteranEnrollment | null;
  diploma: VeteranDiploma | null;
}

export function getVeteranMe(): Promise<VeteranMe> {
  return requestAuth<VeteranMe>("/api/v1/clients/veteran/me");
}

/* --------------------------- enrollment (v2) ----------------------- */
/*
 * Wizard v2 — document FIRST. The RG photo runs AI extraction that fills the
 * profile; sections then auto-advance by trigger (not by a "data" POST):
 *   rg --(photos approved + number)--> address --(missing_fields empty)-->
 *   education --(POST)--> selfie --(approved)--> awaiting_release --(polo)--> student
 * RG and selfie are asynchronous: POST returns immediately, the client polls
 * the matching GET until validation/selfie status settles.
 */

/** AI/coordinator verdict on an uploaded artifact (RG, selfie). */
export type ValidationStatus = "pending" | "approved" | "rejected" | "review";

export interface EnrollmentProfile {
  mother_name?: string | null;
  father_name?: string | null;
  marital_status?: string | null;
  birthplace?: string | null;
  nationality?: string | null;
}

/** Per-photo slot status (backend returns this in `photos`). */
export interface PhotoSlotStatus {
  status: string; // "pending" | "approved" | "rejected" | "review"
  reason?: string | null;
}

/** RG block as embedded in /enrollment/me — photos + verdict, no PII detail. */
export interface RgBrief {
  number?: string | null;
  issuing_agency?: string | null;
  issue_date?: string | null;
  front_photo?: string | null;
  back_photo?: string | null;
  full_photo?: string | null;
  /** Unified async verdict (preferred). `validation_*` are the legacy mirror. */
  analysis_status?: string | null;
  /**
   * Orientação PÚBLICA — o que fazer agora, nunca o critério. O motivo técnico da IA (lado
   * trocado, nome divergente, suspeita de adulteração) fica no servidor e só o hub/staff lê.
   */
  analysis_reason?: string | null;
  validation_status?: string | null;
  validation_reason?: string | null;
  missing_fields?: string[] | null;
  /**
   * Reprovado: o aluno volta pro documento assim que entra e só sai quando reenviar (o upload
   * re-arma a análise e derruba a flag; reprovou de novo, ela sobe de novo).
   */
  blocked?: boolean;
  /** Next photo slot the backend expects: "rg_front" | "rg_back" | null. */
  next_slot?: "rg_front" | "rg_back" | "rg_full" | null;
  /** Per-photo individual status (e.g. photos.rg_front.status = "approved"). */
  photos?: Record<string, PhotoSlotStatus>;
}

/** Full RG section (GET/PATCH /enrollment/documents/rg). name/birth_date are LOCKED. */
export interface RgSection extends RgBrief {
  mother_name?: string | null;
  father_name?: string | null;
  birthplace?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
  name?: string | null;
  birth_date?: string | null;
}

/** Editable RG fields (PATCH). Excludes the locked name/birth_date. */
export interface RgPatchIn {
  number?: string | null;
  issuing_agency?: string | null;
  issue_date?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
  birthplace?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
}

export type EducationLevel = "fundamental" | "medio";

export interface EducationOut {
  level?: EducationLevel | null;
  grade?: number | null;
  completed?: boolean | null;
  last_school?: string | null;
  city?: string | null;
  state?: string | null;
  last_year_when?: string | null;
}

export interface EducationIn {
  level: EducationLevel;
  grade: number;
  completed: boolean;
  last_school: string;
  city: string;
  state: string;
  last_year_when?: string | null;
}

/**
 * EnrollmentMeOut — resume authority: `status` is the section to fill NOW.
 * Also the CANONICAL body of every enrollment mutation (proposta #3): POST/PATCH address,
 * PATCH rg, POST education and POST selfie all echo this exact shape, so the wizard can route
 * by `status` and read each nested section without a re-fetch.
 */
/** Comprovante de endereço (F1) — bloco de validação IA no /me. */
export interface AddressProofSection {
  exists: boolean;
  photo: string | null;
  /** pending | approved | rejected | review | needs_kinship */
  status: string | null;
  /** Orientação pública (o que fazer) — o critério fica interno (hub/staff). */
  reason: string | null;
  needs_kinship: boolean;
  /**
   * Com needs_kinship: "confirm" = sobrenome em comum, só confirmar o grau de parentesco ·
   * "justify" = titular sem relação aparente, justificar o vínculo com o endereço.
   */
  kinship_kind: "confirm" | "justify" | null;
  kinship_relation: string | null;
  /** Coordenador rejeitou a justificativa: travar no comprovante até um novo upload. */
  needs_new_proof: boolean;
}

export interface EnrollmentMe {
  external_id: string;
  status: string;
  hub_external_id: string;
  selfie_verified: boolean;
  selfie_status: string;
  /** Selfie async verdict + poll ack — populated on POST /selfie. */
  analysis_status?: string | null;
  poll_after_ms?: number | null;
  expires_at?: string | null;
  profile?: EnrollmentProfile | null;
  address_complete?: boolean;
  address?: AddressOut | null;
  address_proof?: AddressProofSection | null;
  rg?: RgBrief | null;
  education?: EducationOut | null;
  selfie?: SelfieOut | null;
}

export function getEnrollmentMe(): Promise<EnrollmentMe> {
  return requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/me");
}

/* RG ---------------------------------------------------------------- */

/**
 * Async ack — the upload kicks off AI; the client polls until the verdict
 * settles. `poll_after_ms`/`expires_at` (when present) bound the polling;
 * `analysis` ("pending") is the legacy field.
 */
export interface AnalysisAck {
  analysis_status?: string | null;
  analysis?: string | null;
  poll_after_ms?: number | null;
  expires_at?: string | null;
}

export function getEnrollmentRg(): Promise<RgSection> {
  return requestAuth<RgSection>("/api/v1/clients/enrollment/documents/rg");
}

/**
 * Complete/correct extracted fields; accepted even after the section advances.
 * Returns the canonical EnrollmentMe (proposta #3) — the RG detail stays on GET .../rg.
 */
export function patchEnrollmentRg(data: RgPatchIn): Promise<EnrollmentMe> {
  return requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/documents/rg", {
    method: "PATCH",
    json: data,
  });
}

/** slot: "front" | "back" | "full" (whole document in one photo). */
export function postEnrollmentRgPhoto(
  slot: "front" | "back" | "full",
  file: File,
): Promise<AnalysisAck> {
  return requestAuth<AnalysisAck>(`/api/v1/clients/enrollment/documents/rg/photo/${slot}`, {
    file,
    timeoutMs: 60_000,
  });
}

/**
 * Classificação RÁPIDA da foto ANTES de enviar (IA→OmniRoute, síncrona). Só reconhece — NÃO valida.
 * `is_document=null` = a IA não decidiu → confirmar o tipo com a pessoa (erro da IA nunca bloqueia).
 * `doc_type`: "rg" | "cnh" | null; `completeness`: "front" | "back" | "full" | null.
 */
export interface DocClassify {
  is_document: boolean | null;
  doc_type: "rg" | "cnh" | "address_proof" | null;
  completeness: "front" | "back" | "full" | null;
  is_legible?: boolean | null;
  reason?: string | null;
  confidence: number | null;
}

export function classifyDocument(file: File): Promise<DocClassify> {
  return requestAuth<DocClassify>("/api/v1/clients/enrollment/documents/classify", {
    file,
    timeoutMs: 30_000,
  });
}

/* address ----------------------------------------------------------- */

/** AddressOut — `cep` is canonical; `zipcode` is a deprecated mirror. */
export interface AddressOut {
  cep: string | null;
  zipcode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  missing_fields: string[];
}

/** PATCH fills only EMPTY fields server-side (never overwrites the CEP lookup). */
export interface AddressPatchIn {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

export function getEnrollmentAddress(): Promise<AddressOut> {
  return requestAuth<AddressOut>("/api/v1/clients/enrollment/address");
}

/** Defensive fallback — the canonical body always carries `address`, but never read off undefined. */
const EMPTY_ADDRESS: AddressOut = {
  cep: null,
  zipcode: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
  country: null,
  missing_fields: [],
};

/**
 * POST {cep} — ViaCEP creates the address. The backend echoes the canonical EnrollmentMe
 * (proposta #3) with the address NESTED under `.address`; we unwrap it so the step keeps a flat
 * AddressOut (incl. `missing_fields`). GET stays flat. Without this unwrap the form would render
 * blank after "Buscar CEP" and the missing-fields gating would die.
 */
export async function postEnrollmentCep(cep: string): Promise<AddressOut> {
  const me = await requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/address", {
    json: { cep },
  });
  return me.address ?? EMPTY_ADDRESS;
}

/** PATCH fills only EMPTY fields server-side; echoes the canonical EnrollmentMe (unwrap `.address`). */
export async function patchEnrollmentAddress(data: AddressPatchIn): Promise<AddressOut> {
  const me = await requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/address", {
    method: "PATCH",
    json: data,
  });
  return me.address ?? EMPTY_ADDRESS;
}

/* address proof (comprovante) --------------------------------------- */

/**
 * Comprovante de endereço — OBRIGATÓRIO (KYC): o backend não sai de `status="address"`
 * até a IA aprovar. Multipart (foto/PDF); echoes the canonical EnrollmentMe (novo `status` +
 * `address_proof.status` pra o polling). Sem esta tela o aluno trava no endereço.
 */
export function uploadEnrollmentAddressProof(file: File): Promise<EnrollmentMe> {
  return requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/address/proof", {
    file,
    timeoutMs: 60_000,
  });
}

/** Titular do comprovante é outra pessoa (`needs_kinship`): informa o parentesco e libera. */
export function submitAddressProofKinship(relation: string): Promise<EnrollmentMe> {
  return requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/address/proof/kinship", {
    json: { relation },
  });
}

/** Comprovante decidido — IA/coordenador aprovou/reprovou/mandou revisar OU pediu parentesco. */
export function isAddressProofSettled(status: string | null | undefined): boolean {
  return (
    status === "approved" ||
    status === "rejected" ||
    status === "review" ||
    status === "needs_kinship"
  );
}

/* education --------------------------------------------------------- */

export function getEnrollmentEducation(): Promise<EducationOut> {
  return requestAuth<EducationOut>("/api/v1/clients/enrollment/education");
}

/** Echoes the canonical EnrollmentMe — read `status` to route (no /me re-fetch). */
export function postEnrollmentEducation(edu: EducationIn): Promise<EnrollmentMe> {
  return requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/education", { json: edu });
}

/* selfie ------------------------------------------------------------ */

/**
 * SelfieOut — `analysis_status`/`analysis_reason` are the unified verdict
 * (preferred); `status`/`description` are the legacy mirror. `verified` is the
 * biometric match (distinct from the verdict).
 */
export interface SelfieOut {
  exists: boolean;
  photo: string | null;
  taken_at: string | null;
  analysis_status?: string | null;
  analysis_reason?: string | null;
  status: string | null;
  verified: boolean;
  description: string | null;
  /**
   * Selfies recusadas até aqui. Cada nova foto ENTRA na biometria e a nota do passo passa a
   * ser a melhor já obtida — não se recomeça do zero a cada tentativa. A tela usa isto pra
   * mudar o tom em vez de repetir o mesmo aviso seco.
   */
  attempts?: number;
}

export function getEnrollmentSelfie(): Promise<SelfieOut> {
  return requestAuth<SelfieOut>("/api/v1/clients/enrollment/selfie");
}

/** Echoes the canonical EnrollmentMe, which carries the selfie poll ack (poll_after_ms/expires_at). */
export function postEnrollmentSelfie(file: File): Promise<EnrollmentMe> {
  return requestAuth<EnrollmentMe>("/api/v1/clients/enrollment/selfie", {
    file,
    timeoutMs: 60_000,
  });
}

/* unified async-status readers — prefer `analysis_*`, fall back to legacy ----- */

export function rgAnalysisStatus(rg: RgBrief): string | null {
  return rg.analysis_status ?? rg.validation_status ?? null;
}
export function rgAnalysisReason(rg: RgBrief): string | null {
  return rg.analysis_reason ?? rg.validation_reason ?? null;
}
export function selfieAnalysisStatus(s: SelfieOut): string | null {
  return s.analysis_status ?? s.status ?? null;
}
export function selfieAnalysisReason(s: SelfieOut): string | null {
  return s.analysis_reason ?? s.description ?? null;
}
