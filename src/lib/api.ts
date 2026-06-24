import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/config";
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

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
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

/**
 * Authenticated request with silent refresh: on 401, exchanges the refresh_token
 * once (POST /auth/refresh) and retries. If refresh also fails, the session is
 * cleared so guards send the user back to the funnel start.
 */
async function requestAuth<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError("Sessão expirada. Entre novamente.", 401);
  try {
    return await request<T>(path, { ...opts, token });
  } catch (error: unknown) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        const tokens = await request<LoginResponse>("/api/v1/clients/auth/refresh", {
          json: { refresh_token: refresh },
        });
        saveLogin({ ...tokens });
        return await request<T>(path, { ...opts, token: tokens.access_token });
      } catch {
        // fall through to session reset
      }
    }
    clearSession();
    throw new ApiError("Sessão expirada. Entre novamente.", 401);
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
}

/** Roles that may enter the client app. Anyone without one is staff-only -> blocked. */
export const CLIENT_ROLES = ["lead", "enrollment", "student", "veteran"] as const;

export function isClient(roles: string[] | null | undefined): boolean {
  if (!roles) return false;
  return roles.some((r) => (CLIENT_ROLES as readonly string[]).includes(r));
}

/** Check a phone against the client pipeline. `phone` must be digits-only (10/11). */
export function checkPhone(phone: string): Promise<CheckResponse> {
  return request<CheckResponse>("/api/v1/clients/auth/check", { json: { phone } });
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

/** Estados do aluno na Fase 3+ (após matrícula concluída). */
export type StudentStatus =
  | "awaiting_documents"
  | "documents_under_review"
  | "blood_type_pending"
  | "exam_released";

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

/** Echo canônico do /student/me — agora carrega documents + blood_type. */
export interface StudentMe {
  external_id?: string;
  name?: string | null;
  status?: string | null;
  platform?: StudentPlatform | null;
  documents?: StudentDocument[];
  blood_type?: BloodType | null;
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
  analysis_reason?: string | null;
  validation_status?: string | null;
  validation_reason?: string | null;
  missing_fields?: string[] | null;
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
