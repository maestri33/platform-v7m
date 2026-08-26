/**
 * Tipos do sub-router `leadership` (console do coordenador).
 *
 * Alinhados aos schemas REAIS do OpenAPI vivo (verificado 2026-06-21):
 * HubLeadRowOut, HubLeadDetailOut, ReviewsOut/ReviewItemOut, PaginatedOut.
 * Onde a spec ainda devolve objeto livre (enrollments/{id}, candidates/{id},
 * students/{id}), tipamos permissivo e renderizamos defensivamente.
 */

export const LEADERSHIP = "/api/v1/leadership";

/** Linha da lista de leads do polo — `HubLeadRowOut`. */
export type HubLeadRow = {
  external_id: string;
  status: string;
  name: string | null;
  phone: string | null;
  promoter_external_id: string | null;
  payment_link: string | null;
  receipt_url: string | null;
};

/**
 * Detalhe do lead — `HubLeadDetailOut`. `customer`/`promoter`/`checkout` são
 * objetos aninhados (LeadCustomerOut/LeadPromoterOut/LeadCheckoutOut); os campos
 * internos não estão enumerados na spec → render defensivo.
 */
export type LeadDetail = {
  external_id: string;
  status: string;
  failed_reason?: string | null;
  created_at?: string | null;
  customer?: Record<string, unknown> | null;
  promoter?: Record<string, unknown> | null;
  checkout?: Record<string, unknown> | null;
};

/** Item de qualquer balde do `/reviews` — `ReviewItemOut` (normalizado). */
export type ReviewItem = {
  external_id: string;
  type: "enrollment" | "candidate" | "student" | "promoter" | (string & {});
  kind:
    | "rg"
    | "selfie"
    | "document"
    | "awaiting_approval"
    | "locked_training"
    | (string & {});
  name?: string | null;
  doc_type?: string | null;
  since?: string | null;
  rejected?: boolean | null;
  document_external_id?: string | null;
  student_external_id?: string | null;
  promoter_external_id?: string | null;
  pending_materials?: unknown;
};

/** Resposta do `/reviews` — `ReviewsOut`: 7 baldes de `ReviewItem`. */
export type ReviewsOut = {
  enrollment_rg: ReviewItem[];
  enrollment_selfie: ReviewItem[];
  candidate_document: ReviewItem[];
  candidate_selfie: ReviewItem[];
  student_documents: ReviewItem[];
  candidates_awaiting_approval: ReviewItem[];
  locked_promoters: ReviewItem[];
};

/** Envelope paginado do back — `PaginatedOut` (ex.: GET /students). */
export type PaginatedOut<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/** Body de `POST /candidates/{id}/reject` — `RejectIn`. Motivo obrigatório (a pessoa lê). */
export type RejectIn = { reason: string };

/**
 * Body de decisão compartilhado (`SelfieDecideIn`/`DocDecideIn` no back): vale
 * pro documento e pra selfie do candidato. `approve=false` pede, na prática, um
 * `reason`. Usado nas próximas fatias (decidir documento/selfie).
 */
export type DecideIn = { approve: boolean; reason?: string | null };

/* ---------------------------------------------------------------------------
 * Candidato L2 — contratos TIPADOS no OpenAPI vivo (HEAD cb0ba9d, 2026-06-23).
 * `CandidateDetailOut` expõe um subconjunto enumerado + `user` aninhado; campos
 * extras que o back venha a acrescentar caem no index signature (render defensivo,
 * mesmo padrão do `DocumentSection`). Os shapes "dict-of-purpose" (document/decide,
 * document/reset → devolvem o /me inteiro; GET /{id}/selfie) seguem sem tipo aqui.
 * ------------------------------------------------------------------------- */

/** `CandidateUserOut` aninhado em CandidateDetailOut (campos não enumerados na spec). */
export type CandidateUser = {
  external_id?: string;
  name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  email?: string | null;
  birth_date?: string | null;
  [k: string]: unknown;
};

/** `CandidateDetailOut` — GET /leadership/candidates/{id}. */
export type CandidateDetail = {
  external_id: string;
  status: string;
  user: CandidateUser;
  doc_type?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
  marital_status?: string | null;
  birthplace?: string | null;
  nationality?: string | null;
  pix_key?: string | null;
  pix_key_type?: string | null;
  pix_validated: boolean;
  selfie_status: string;
  selfie_image?: string | null;
  selfie_description?: string | null;
  [k: string]: unknown;
};

/** `CandidateActionOut` — POST /candidates/{id}/approve e /reject. */
export type CandidateAction = { external_id: string; status: string };

/** `CandidateSelfieDecideOut` — POST /candidates/{id}/selfie/decide. */
export type CandidateSelfieDecide = {
  external_id: string;
  selfie_status: string;
  status: string;
};

/* ---------------------------------------------------------------------------
 * Matrícula (enrollment) — fluxo NOVO do coordenador (/leadership/enrollments).
 * Fila + detalhe são LEITURA. As mutações — fee/pay, fee/schedule (R$ real via
 * Asaas/DICT) e conclude (gera login/senha da plataforma do aluno) — mexem em
 * dinheiro e credenciais reais → Portão 3 com o Victor, fora do read-only.
 * ------------------------------------------------------------------------- */

/** `HubEnrollmentRowOut` — item de GET /enrollments. `fees` é objeto livre. */
export type HubEnrollmentRow = {
  external_id: string;
  name: string | null;
  phone: string | null;
  status: string;
  fees: Record<string, unknown>;
  created_at: string;
};

/** `EnrollmentFeeDictOut` — bloco de uma parcela (dentro de `EnrollmentFeesOut`). */
export type EnrollmentFeeDict = {
  status: string;
  amount: string;
  paid: boolean;
  scheduled_for?: string | null;
  last_error?: string | null;
};

/** `EnrollmentFeesOut` — bloco `fees` do detalhe. É o que o coordenador consulta
 *  pra decidir se já pode pagar/agendar/concluir. */
export type EnrollmentFees = {
  first: EnrollmentFeeDict | null;
  second: EnrollmentFeeDict | null;
  first_paid: boolean;
  second_scheduled: boolean;
};

/** GET /enrollments/{id} — objeto LIVRE (sem schema no OpenAPI) → render defensivo. */
export type EnrollmentDetail = Record<string, unknown> & {
  fees?: EnrollmentFees;
};

/** Body de POST /enrollments/{id}/fee/pay e /fee/schedule — `FeeIn`. */
export type FeeIn = { qr_code: string; amount?: string | null };

/** Body de POST /enrollments/{id}/conclude — `ConcludeIn`. Promove enrollment → student. */
export type ConcludeIn = {
  platform_login: string;
  platform_password: string;
  platform_url?: string | null;
  platform_notes?: string | null;
};

/** `EnrollmentActionOut` — resposta de conclude. */
export type EnrollmentAction = { external_id: string; status: string };

/* ---------------------------------------------------------------------------
 * Aluno (student) — funil que o coordenador conduz (student → veteran). Lista
 * paginada + detalhe rico. As mutações (corrigir prova, decidir documento, abrir/
 * resolver pendência, liberar documentação, emitir diploma) mexem em identidade/
 * status reais → Portão 3 com o Victor, confirmação em 2 passos no AlunoActions.
 * Contratos espelham os schemas REAIS de api/leadership.py (HubStudentRowOut,
 * HubStudentDetailOut e os *Out de cada ação).
 * ------------------------------------------------------------------------- */

/** `HubStudentRowOut` — item de GET /students (envelope PaginatedStudentsOut). */
export type HubStudentRow = {
  external_id: string;
  name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

/** `StudentPlatformOut` — credenciais da instituição parceira (visão do coordenador). */
export type StudentPlatform = {
  url?: string | null;
  login?: string | null;
  password?: string | null;
  notes?: string | null;
};

/** `StudentDocItemOut` — um documento do aluno. NÃO traz external_id: a decisão de
 *  documento é disparada a partir da fila de Revisões, que carrega o document_external_id. */
export type StudentDocItem = {
  doc_type: string;
  validation_status: string;
  has_photo: boolean;
};

/** `StudentPendencyOut` — pendência (documento ou taxa) aberta pelo coordenador. */
export type StudentPendency = {
  external_id: string;
  kind: string;
  description: string;
  amount_cents?: number | null;
  resolved: boolean;
};

/** `StudentDiplomaOut` — `null` enquanto o diploma não foi emitido. */
export type StudentDiploma = {
  issued_at?: string | null;
  picked_up: boolean;
};

/** `StudentUserOut` aninhado em HubStudentDetailOut. */
export type StudentUser = {
  external_id: string;
  name?: string | null;
  cpf?: string | null;
  phone?: string | null;
  email?: string | null;
};

/** `HubStudentDetailOut` — GET /students/{id}. */
export type StudentDetail = {
  external_id: string;
  status: string;
  hub_external_id: string;
  blood_type?: string | null;
  self_study: boolean;
  platform: StudentPlatform;
  documents: StudentDocItem[];
  pendencies: StudentPendency[];
  diploma: StudentDiploma | null;
  user: StudentUser;
};

/** Body de POST /students/{id}/exam/grade — `ExamGradeIn`. */
export type ExamGradeIn = { passed: boolean; notes?: string | null };

/** Body de POST /students/{id}/documents/{doc}/decide — `DocDecideIn`. */
export type DocDecideIn = { approve: boolean; reason?: string | null };

/** Body de POST /students/{id}/pendencies — `PendencyIn`. `amount_cents` só pra kind=fee. */
export type PendencyIn = {
  kind: "document" | "fee";
  description: string;
  amount_cents?: number | null;
};

/* ---------------------------------------------------------------------------
 * Promotores do polo — listar/suspender/reativar + aprovar matéria em aberto de
 * quem está travado no treino. `HubPromoterRowOut` + `MaterialApproveOut`.
 * ------------------------------------------------------------------------- */

/** `HubPromoterRowOut` — item de GET /promoters. `external_id` é o do User-promotor. */
export type HubPromoterRow = {
  external_id: string;
  name: string | null;
  status: string;
  locked: boolean;
};

/** Uma matéria de treino pendente de um promotor travado (vem em /reviews → locked_promoters). */
export type PendingMaterial = {
  material_external_id: string;
  title: string;
  blocking: boolean;
  kind: string;
};

/** `MaterialApproveOut` — resposta de aprovar matéria em aberto. */
export type MaterialApprove = {
  promoter_external_id: string;
  material_external_id: string;
  locked: boolean;
};
