import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/config";
import { clearSession, getAccessToken, getRefreshToken, saveLogin } from "@/lib/session";
import { ApiError } from "@/lib/api";
import type { ReviewItem } from "@/lib/risk-analysis";

const RETRY_DELAYS_MS = [250, 900];

async function requestLeadership<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError("Sessão expirada. Entre novamente.", 401);

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(opts.headers as Record<string, string>),
  };

  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${API_BASE_URL}/api/v1/leadership${path.startsWith("/") ? path : `/${path}`}`;
  const signal = opts.signal ?? AbortSignal.timeout(API_TIMEOUT_MS);

  const execute = async () => {
    const res = await fetch(url, { ...opts, headers, signal });
    if (res.status === 401) {
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/v1/leadership/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refresh }),
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
          });
          if (refreshRes.ok) {
            const newTokens = await refreshRes.json();
            saveLogin(newTokens);
            headers.Authorization = `Bearer ${newTokens.access_token}`;
            const retryRes = await fetch(url, { ...opts, headers, signal });
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => ({}));
              throw new ApiError(errData.detail || `Erro ${retryRes.status}`, retryRes.status, errData.code);
            }
            return (await retryRes.json().catch(() => ({}))) as T;
          }
        } catch {
          // fallback to throw unauthorized
        }
      }
      clearSession();
      throw new ApiError("Sessão expirada. Faça login novamente.", 401, "UNAUTHORIZED");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.detail || `Erro ${res.status}`, res.status, data.code, data.extra);
    }
    return data as T;
  };

  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await execute();
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return execute();
}

export interface CandidateAwaitingRow {
  external_id: string;
  name: string | null;
  since: string;
  rejected: boolean;
}

export interface CandidateDetail {
  external_id: string;
  name?: string | null;
  selfie?: {
    photo?: string | null;
    image?: string | null;
    status?: string | null;
  };
  selfie_image?: string | null;
  selfie_status?: string | null;
  doc_type?: string | null;
  rg?: {
    front_photo?: string | null;
    back_photo?: string | null;
    full_photo?: string | null;
    validation_status?: string | null;
  };
  document?: {
    front_photo?: string | null;
    back_photo?: string | null;
    full_photo?: string | null;
  };
  photo?: string | null;
  user?: {
    name?: string | null;
    cpf?: string | null;
    phone?: string | null;
  };
  profile?: {
    mother_name?: string | null;
    birthplace?: string | null;
  };
  mother_name?: string | null;
  birthplace?: string | null;
  pix_key?: string | null;
  pix_validated?: boolean;
  status?: string;
}

export interface HubPromoterRow {
  external_id: string;
  name: string | null;
  status: string;
  locked: boolean;
}

export interface HubEnrollmentRow {
  external_id: string;
  created_at: string;
  status: string;
  student_name: string | null;
  promoter_name: string | null;
  promoter_external_id: string | null;
  has_divergence: boolean;
  missing_data: boolean;
  needs_review: boolean;
  risk_reasons: string[];
}

export interface HubLeadRow {
  external_id: string;
  created_at: string;
  status: string;
  name: string | null;
  promoter_name: string | null;
  promoter_external_id: string | null;
  cpf: string | null;
  phone: string | null;
}

export interface HubReviewsResponse {
  enrollment_rg?: ReviewItem[];
  enrollment_selfie?: ReviewItem[];
  candidate_document?: ReviewItem[];
  candidate_selfie?: ReviewItem[];
  student_documents?: ReviewItem[];
  candidates_awaiting_approval?: ReviewItem[];
  locked_promoters?: ReviewItem[];
}

export interface HubStudentsResponse {
  total: number;
  results: Record<string, unknown>[];
}

export interface ReviewDetail {
  selfie?: {
    photo?: string | null;
    image?: string | null;
    status?: string | null;
  };
  selfie_image?: string | null;
  rg?: {
    front_photo?: string | null;
    back_photo?: string | null;
    full_photo?: string | null;
    validation_status?: string | null;
  };
  document?: {
    front_photo?: string | null;
    back_photo?: string | null;
    full_photo?: string | null;
  };
  photo?: string | null;
  user?: {
    name?: string | null;
    cpf?: string | null;
    phone?: string | null;
  };
  profile?: {
    mother_name?: string | null;
    birthplace?: string | null;
  };
  mother_name?: string | null;
  birthplace?: string | null;
  status?: string;
}

export const apiLeadership = {
  // Reviews / Inbox
  async listReviews(): Promise<HubReviewsResponse> {
    return requestLeadership<HubReviewsResponse>("/reviews");
  },

  // Candidates
  async listCandidatesAwaiting(): Promise<CandidateAwaitingRow[]> {
    return requestLeadership<CandidateAwaitingRow[]>("/candidates");
  },

  async getCandidateDetail(externalId: string): Promise<CandidateDetail> {
    return requestLeadership<CandidateDetail>(`/candidates/${externalId}`);
  },

  async approveCandidate(externalId: string): Promise<Record<string, unknown>> {
    return requestLeadership<Record<string, unknown>>(`/candidates/${externalId}/approve`, { method: "POST" });
  },

  async rejectCandidate(externalId: string, reason: string): Promise<Record<string, unknown>> {
    return requestLeadership<Record<string, unknown>>(`/candidates/${externalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async resetCandidateDocType(externalId: string): Promise<Record<string, unknown>> {
    return requestLeadership<Record<string, unknown>>(`/candidates/${externalId}/document/reset`, { method: "POST" });
  },

  // Promoters & Team
  async listPromoters(): Promise<HubPromoterRow[]> {
    return requestLeadership<HubPromoterRow[]>("/promoters");
  },

  async suspendPromoter(externalId: string): Promise<HubPromoterRow> {
    return requestLeadership<HubPromoterRow>(`/promoters/${externalId}/suspend`, { method: "POST" });
  },

  async reactivatePromoter(externalId: string): Promise<HubPromoterRow> {
    return requestLeadership<HubPromoterRow>(`/promoters/${externalId}/reactivate`, { method: "POST" });
  },

  async approvePromoterTrainingMaterial(promoterExternalId: string, materialExternalId: string): Promise<Record<string, unknown>> {
    return requestLeadership<Record<string, unknown>>(`/promoters/${promoterExternalId}/materials/${materialExternalId}/approve`, {
      method: "POST",
    });
  },

  // Enrollments
  async listEnrollments(status?: string): Promise<HubEnrollmentRow[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return requestLeadership<HubEnrollmentRow[]>(`/enrollments${q}`);
  },

  async getEnrollment(externalId: string): Promise<ReviewDetail> {
    return requestLeadership<ReviewDetail>(`/enrollments/${externalId}`);
  },

  // Leads
  async listLeads(status?: string): Promise<HubLeadRow[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return requestLeadership<HubLeadRow[]>(`/leads${q}`);
  },

  // Students
  async listStudents(params?: { status?: string; limit?: number; offset?: number }): Promise<HubStudentsResponse> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return requestLeadership<HubStudentsResponse>(`/students${qs}`);
  },
};
