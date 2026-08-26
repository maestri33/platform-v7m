export interface HubInfo {
  external_id: string;
  brand: string;
}

export interface CoordinatorUser {
  external_id: string;
  phone?: string | null;
  name?: string | null;
  hub?: HubInfo | null;
}

export interface CoordinatorCheckResponse {
  found: boolean;
  external_id?: string | null;
  otp_sent: boolean;
  otp_wait?: number | null;
  whatsapp?: boolean | null;
  roles?: string[] | null;
  token?: string | null;
  is_coordinator: boolean;
  hub?: HubInfo | null;
  detail?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface ReviewItem {
  external_id: string;
  type: "enrollment" | "candidate" | "student" | "promoter" | string;
  kind: "rg" | "selfie" | "document" | "awaiting_approval" | "locked_training" | string;
  name?: string | null;
  doc_type?: string | null;
  since?: string | null;
  rejected?: boolean | null;
  document_external_id?: string | null;
  student_external_id?: string | null;
  promoter_external_id?: string | null;
  pending_materials?: Array<Record<string, unknown>> | null;
  // Extensões de UI / Análise
  validation_status?: string | null;
  validation_reason?: string | null;
  analysis_status?: string | null;
  analysis_reason?: string | null;
  risk_level?: "critical" | "warning" | "normal";
  divergences?: string[];
  ai_summary?: string;
}

export interface ReviewsResponse {
  enrollment_rg: ReviewItem[];
  enrollment_selfie: ReviewItem[];
  candidate_document: ReviewItem[];
  candidate_selfie: ReviewItem[];
  student_documents: ReviewItem[];
  candidates_awaiting_approval: ReviewItem[];
  locked_promoters: ReviewItem[];
}

export interface EnrollmentFeeDict {
  status: string;
  amount: string;
  scheduled_for?: string | null;
  paid: boolean;
  last_error?: string | null;
}

export interface EnrollmentFees {
  first?: EnrollmentFeeDict | null;
  second?: EnrollmentFeeDict | null;
  first_paid: boolean;
  second_scheduled: boolean;
}

export interface HubEnrollmentRow {
  external_id: string;
  name?: string | null;
  phone?: string | null;
  status: string;
  fees: EnrollmentFees;
  created_at: string;
}

export interface HubStudentRow {
  external_id: string;
  name?: string | null;
  phone?: string | null;
  status: string;
  created_at: string;
}

export interface PaginatedStudentsResponse {
  items: HubStudentRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface HubPromoterRow {
  external_id: string;
  name?: string | null;
  status: string;
  locked: boolean;
}

export interface HubLeadRow {
  external_id: string;
  status: string;
  name?: string | null;
  phone?: string | null;
  promoter_external_id: string;
  payment_link?: string | null;
  receipt_url?: string | null;
}

export interface CandidateAwaitingRow {
  external_id: string;
  name?: string | null;
  since?: string | null;
  rejected: boolean;
}
