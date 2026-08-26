/**
 * Tipos canônicos do backend Django (sub-router `collaborators`).
 *
 * Shapes conferidos contra o `openapi.json` de produção (2026-07-05) — quando o
 * front divergir do contrato, é AQUI que se corrige primeiro e o TypeScript
 * aponta os usos.
 */

// Valores exatos do backend (users/roles/candidate/models.py:Status — minúsculos).
// `approved`/`rejected` são pós-funil (decisão do coordenador) — o candidato
// segue com esses status no me_dict e o front PRECISA tratá-los.
export type CandidateStatus =
  | "started"
  | "profile"
  | "address"
  | "documents"
  | "pix"
  | "education"
  | "selfie"
  | "completed"
  | "approved"
  | "rejected";

export type AnalysisStatus = "pending" | "approved" | "rejected" | "review";

export type AddressSection = {
  zipcode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  missing_fields: string[];
};

export type ProfileSection = {
  mother_name: string | null;
  father_name: string | null;
  birthplace: string | null;
  marital_status: string | null;
  nationality: string | null;
  // do CPFHub — read-only
  name: string | null;
  birth_date: string | null;
  education_level?: string | null;
  education_completed?: boolean | null;
  education_grade?: number | null;
  education_status?: "completed" | "attending" | "stopped" | null;
  education_year?: number | null;
  education_city?: string | null;
  education_school?: string | null;
};

/** Seção rica do documento — `GET /candidate/document` (a que o DocForm consome). */
export type DocumentSection = {
  doc_type?: string;
  number?: string;
  issuing_agency?: string | null;
  issue_date?: string | null;
  category?: string | null;
  national_register?: string | null;
  date_of_birth?: string | null;
  expires_on?: string | null;
  analysis_status?: AnalysisStatus;
  analysis_reason?: string | null;
  missing_fields?: string[];
  has_front?: boolean;
  has_back?: boolean;
  has_full?: boolean;
  front_photo?: string | null;
  back_photo?: string | null;
  full_photo?: string | null;
  /** Slot-a-slot (RG): qual foto o backend pede a seguir (rg_front/rg_back/cnh_full…). */
  next_slot?: string | null;
  /** Status por slot de foto já enviado. */
  photos?: Record<string, { status?: AnalysisStatus } & Record<string, unknown>>;
  [k: string]: unknown;
};

/** Sub-bloco de um documento dentro do `CandidateMeOut.documents`. */
export type DocumentSlot = {
  validation_status?: AnalysisStatus | string | null;
  number?: string | null;
  issuing_agency?: string | null;
  front_photo?: string | null;
  back_photo?: string | null;
  full_photo?: string | null;
  [k: string]: unknown;
};

/** `CandidateMeOut.documents` — bloco rico por tipo de documento (SEM `doc_type`). */
export type DocumentsBlock = {
  rg?: DocumentSlot | null;
  cnh?: DocumentSlot | null;
  certificate?: DocumentSlot | null;
  military?: DocumentSlot | null;
  address_proof?: DocumentSlot | null;
  [k: string]: unknown;
};

export type SelfieSection = {
  taken_at?: string | null;
  analysis_status?: AnalysisStatus;
  analysis_reason?: string | null;
  expires_at?: string | null;
  /** URL da foto — thumb na conta. */
  photo?: string | null;
  /** Contato do polo, quando o backend informar (P2.3) — usado no rejected. */
  hub_whatsapp?: string | null;
  [k: string]: unknown;
};

/** `me_dict.address_proof` — comprovante de residência (gateia profile→address). */
export type AddressProofBlock = {
  exists: boolean;
  photo: string | null;
  status: "pending" | "approved" | "rejected" | "review" | "needs_kinship" | null;
  reason: string | null;
  needs_kinship: boolean;
  kinship_relation: string | null;
};

export type CandidateMe = {
  status: CandidateStatus;
  profile: ProfileSection | null;
  address: AddressSection | null;
  address_proof?: AddressProofBlock | null;
  documents?: DocumentsBlock | null;
  selfie?: SelfieSection | null;
  /** Pix validado sim/não — a CHAVE não vem no contrato (P2.1). */
  pix_validated?: boolean;
  blocks?: ValidationBlock[];
};

export type ValidationBlock = {
  external_id: string;
  source_type: string;
  title: string;
  description: string;
  action_label: string;
  action_route: string;
  created_at: string;
};

/** `PromoterMeOut` — SEM `pix_key` no contrato (P2.1). */
export type PromoterMe = {
  external_id: string;
  hub_external_id: string;
  status: "active" | "suspended";
  ref_url: string;
  pre_matriculado?: boolean;
  blocks?: ValidationBlock[];
};

/**
 * `GET /promoter/me/summary` — números do dashboard direto do backend (parar
 * de calcular no front). Valores monetários são STRING decimal.
 */
export type PromoterSummary = {
  week_goal: number;
  week_paid_leads: number;
  week_commission_total: string;
  bonus_amount: string;
  goal_reached: boolean;
  next_closing_at: string;
  week_start?: string | null;
  lifetime: {
    total_received: string;
    total_students: number;
    goals_hit: number;
  };
};

/** `PromoterLeadOut = {external_id, status, name?, phone?, created_at}` — só isso. */
export type Lead = {
  external_id: string;
  name: string;
  phone?: string | null;
  status: string;
  created_at: string;
};

/** Bloco de conteúdo genérico da aula (`content_blocks[]`). */
export type ContentBlock = {
  type?: string | null;
  text?: string | null;
  url?: string | null;
  label?: string | null;
  [k: string]: unknown;
};

/**
 * `TrainingMaterialOut` — a chave é **`material_external_id`** (não `external_id`).
 * A aula em si vem em `text_content`/`content_blocks`/`photo`/`video`, e a
 * pergunta em `question`. `grade`/`justification` são o feedback da última
 * correção (mostrar a justificativa no rejected; nunca o gabarito).
 */
export type TrainingMaterial = {
  material_external_id: string;
  title: string;
  blocking: boolean;
  kind?: string | null;
  question?: string | null;
  text_content?: string | null;
  content_blocks?: ContentBlock[] | null;
  video?: string | null;
  photo?: string | null;
  assignment_status?: string | null;
  submission_status?: string | null;
  grade?: number | string | null;
  justification?: string | null;
};

export type TrainingProgress = {
  total: number;
  answered: number;
  average_score: number | null;
  pending_external_ids: string[];
};

/** `PromoterCommissionOut` — `amount` é STRING decimal e o campo é `source`. */
export type Commission = {
  external_id: string;
  amount: string;
  status: "pending" | "paid" | "failed";
  source: string;
  created_at: string;
  paid_at?: string | null;
};
