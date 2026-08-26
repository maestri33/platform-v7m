import { sessionStore } from "./session";
import type {
  CoordinatorCheckResponse,
  TokenResponse,
  ReviewsResponse,
  ReviewItem,
  HubEnrollmentRow,
  PaginatedStudentsResponse,
  HubPromoterRow,
  CandidateAwaitingRow,
  HubLeadRow,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1/leadership";

class ApiError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor(message: string, status: number, code?: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const RETRY_DELAYS_MS = [250, 900];
const API_TIMEOUT_MS = 12_000;

let refreshPromise: Promise<TokenResponse> | null = null;

async function refreshAuthTokens(): Promise<TokenResponse> {
  if (!refreshPromise) {
    const refresh = sessionStore.getRefreshToken();
    if (!refresh) {
      throw new ApiError("Sessão expirada. Faça login novamente.", 401, "UNAUTHORIZED");
    }
    refreshPromise = (async () => {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (!refreshRes.ok) {
        throw new ApiError("Refresh failed", refreshRes.status);
      }
      const newTokens: TokenResponse = await refreshRes.json();
      sessionStore.saveSession(newTokens);
      return newTokens;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function requestOnce<T>(
  path: string,
  options: RequestInit = {},
  retry: boolean = true,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = sessionStore.getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const signal = options.signal ?? AbortSignal.timeout(API_TIMEOUT_MS);

  const res = await fetch(url, {
    ...options,
    headers,
    signal,
  });

  if (res.status === 401 && retry) {
    try {
      await refreshAuthTokens();
      return request<T>(path, options, false);
    } catch {
      sessionStore.clearSession();
      throw new ApiError("Sessão expirada. Faça login novamente.", 401, "UNAUTHORIZED");
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      data.detail ||
      data.message ||
      data.error ||
      `Erro ${res.status}: Não foi possível concluir a solicitação.`;
    throw new ApiError(errorMsg, res.status, data.code, data.detail);
  }

  return data as T;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry: boolean = true,
): Promise<T> {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await requestOnce<T>(path, options, retry);
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return await requestOnce<T>(path, options, retry);
}

export const apiLeadership = {
  // --- AUTH ---
  async checkPhone(phone: string): Promise<CoordinatorCheckResponse> {
    return request<CoordinatorCheckResponse>("/auth/check", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  async login(external_id: string, otp: string): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ external_id, otp }),
    });
  },

  // --- REVIEWS / INBOX ---
  async listReviews(): Promise<ReviewsResponse> {
    return request<ReviewsResponse>("/reviews");
  },

  async decideEnrollmentRg(externalId: string, approve: boolean, reason?: string) {
    return request(`/enrollments/${externalId}/rg/decide`, {
      method: "POST",
      body: JSON.stringify({ approve, reason }),
    });
  },

  async decideEnrollmentAddressProof(externalId: string, approve: boolean, reason?: string) {
    return request(`/enrollments/${externalId}/address-proof/decide`, {
      method: "POST",
      body: JSON.stringify({ approve, reason }),
    });
  },

  async decideEnrollmentSelfie(externalId: string, approve: boolean, reason?: string) {
    return request(`/enrollments/${externalId}/selfie/decide`, {
      method: "POST",
      body: JSON.stringify({ approve, reason }),
    });
  },

  async getCandidateSelfie(externalId: string) {
    return request<any>(`/candidates/${externalId}/selfie`);
  },

  async decideCandidateSelfie(externalId: string, approve: boolean, reason?: string) {
    return request(`/candidates/${externalId}/selfie/decide`, {
      method: "POST",
      body: JSON.stringify({ approve, reason }),
    });
  },

  async decideCandidateDocument(externalId: string, approve: boolean, reason?: string) {
    return request(`/candidates/${externalId}/document/decide`, {
      method: "POST",
      body: JSON.stringify({ approve, reason }),
    });
  },

  async resetCandidateDocType(externalId: string) {
    return request(`/candidates/${externalId}/document/reset`, {
      method: "POST",
    });
  },

  // --- CANDIDATES ---
  async listCandidatesAwaiting(): Promise<CandidateAwaitingRow[]> {
    return request<CandidateAwaitingRow[]>("/candidates");
  },

  async getCandidateDetail(externalId: string) {
    return request<any>(`/candidates/${externalId}`);
  },

  async approveCandidate(externalId: string) {
    return request(`/candidates/${externalId}/approve`, {
      method: "POST",
    });
  },

  async rejectCandidate(externalId: string, reason: string) {
    return request(`/candidates/${externalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  // --- ENROLLMENTS (MATRÍCULAS) ---
  async listEnrollments(status?: string): Promise<HubEnrollmentRow[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<HubEnrollmentRow[]>(`/enrollments${q}`);
  },

  async getEnrollment(externalId: string) {
    return request<any>(`/enrollments/${externalId}`);
  },

  async concludeEnrollment(
    externalId: string,
    payload: {
      platform_login: string;
      platform_password: string;
      platform_url?: string;
      platform_notes?: string;
    },
  ) {
    return request(`/enrollments/${externalId}/conclude`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async correctEnrollmentIdentity(
    externalId: string,
    payload: {
      mother_name?: string;
      father_name?: string;
      marital_status?: string;
      nationality?: string;
      birthplace?: string;
    },
  ) {
    return request(`/enrollments/${externalId}/profile`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // --- STUDENTS (ALUNOS) ---
  async listStudents(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedStudentsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<PaginatedStudentsResponse>(`/students${qs}`);
  },

  async getStudent(externalId: string) {
    return request<any>(`/students/${externalId}`);
  },

  async gradeExam(externalId: string, passed: boolean, notes?: string) {
    return request(`/students/${externalId}/exam/grade`, {
      method: "POST",
      body: JSON.stringify({ passed, notes }),
    });
  },

  async decideStudentDocument(
    externalId: string,
    documentExternalId: string,
    approve: boolean,
    reason?: string,
  ) {
    return request(
      `/students/${externalId}/documents/${documentExternalId}/decide`,
      {
        method: "POST",
        body: JSON.stringify({ approve, reason }),
      },
    );
  },

  async openStudentPendency(
    externalId: string,
    payload: { kind: string; description: string; amount_cents?: number },
  ) {
    return request(`/students/${externalId}/pendencies`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resolveStudentPendency(pendencyExternalId: string) {
    return request(`/pendencies/${pendencyExternalId}/resolve`, {
      method: "POST",
    });
  },

  async clearStudentDocumentation(externalId: string) {
    return request(`/students/${externalId}/documentation/clear`, {
      method: "POST",
    });
  },

  // --- PROMOTERS & TRAINING (EQUIPE & TREINO) ---
  async listPromoters(): Promise<HubPromoterRow[]> {
    return request<HubPromoterRow[]>("/promoters");
  },

  async suspendPromoter(externalId: string): Promise<HubPromoterRow> {
    return request<HubPromoterRow>(`/promoters/${externalId}/suspend`, {
      method: "POST",
    });
  },

  async reactivatePromoter(externalId: string): Promise<HubPromoterRow> {
    return request<HubPromoterRow>(`/promoters/${externalId}/reactivate`, {
      method: "POST",
    });
  },

  async approvePromoterTrainingMaterial(
    promoterExternalId: string,
    materialExternalId: string,
  ) {
    return request(
      `/promoters/${promoterExternalId}/materials/${materialExternalId}/approve`,
      {
        method: "POST",
      },
    );
  },

  // --- LEADS ---
  async listLeads(status?: string): Promise<HubLeadRow[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<HubLeadRow[]>(`/leads${q}`);
  },

  async getLead(externalId: string) {
    return request<any>(`/leads/${externalId}`);
  },
};
