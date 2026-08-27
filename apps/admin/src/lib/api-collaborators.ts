import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/config";
import { clearSession, getAccessToken, getRefreshToken, saveLogin } from "@/lib/session";
import { ApiError } from "@/lib/api";

const RETRY_DELAYS_MS = [250, 900];

async function requestCollaborator<T>(path: string, opts: RequestInit = {}): Promise<T> {
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

  const url = `${API_BASE_URL}/api/v1/collaborators${path.startsWith("/") ? path : `/${path}`}`;
  const signal = opts.signal ?? AbortSignal.timeout(API_TIMEOUT_MS);

  const execute = async () => {
    const res = await fetch(url, { ...opts, headers, signal });
    if (res.status === 401) {
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/v1/collaborators/auth/refresh`, {
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

export interface PromoterMeResponse {
  external_id: string;
  name: string | null;
  phone: string | null;
  code: string | null;
  referral_url: string | null;
  active: boolean;
  total_sales: number;
  total_commissions_cents: number;
  available_commissions_cents: number;
  pending_commissions_cents: number;
  hub_brand: string | null;
  pix_key?: string | null;
}

export interface PromoterLeadRow {
  external_id: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  status: string;
}

export interface PromoterCommissionRow {
  external_id: string;
  amount_cents: number;
  amount_formatted?: string;
  status: string;
  created_at: string;
  released_at: string | null;
  student_name: string | null;
}

export interface PromoterTrainingMaterial {
  external_id: string;
  title: string;
  question: string;
  text_content?: string | null;
  video?: string | null;
  photo?: string | null;
  blocking: boolean;
  active: boolean;
  passed?: boolean;
}

export const apiCollaborators = {
  // Promoter stats & profile
  async getPromoterMe(): Promise<PromoterMeResponse> {
    return requestCollaborator<PromoterMeResponse>("/promoter/me");
  },

  async updatePixKey(pix_key: string): Promise<Record<string, unknown>> {
    return requestCollaborator("/promoter/pix", {
      method: "PUT",
      body: JSON.stringify({ pix_key }),
    });
  },

  // Leads
  async listMyLeads(): Promise<PromoterLeadRow[]> {
    return requestCollaborator<PromoterLeadRow[]>("/promoter/leads");
  },

  // Commissions
  async listMyCommissions(): Promise<PromoterCommissionRow[]> {
    return requestCollaborator<PromoterCommissionRow[]>("/promoter/commissions");
  },

  // Training
  async listMyTrainingMaterials(): Promise<PromoterTrainingMaterial[]> {
    return requestCollaborator<PromoterTrainingMaterial[]>("/training/materials");
  },

  async submitQuizAnswer(materialId: string, answer: string): Promise<Record<string, unknown>> {
    return requestCollaborator(`/training/materials/${materialId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
  },
};
