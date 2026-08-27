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
  next_slot?: string | null;
  photos?: Record<string, { status?: AnalysisStatus } & Record<string, unknown>>;
  [k: string]: unknown;
};

export type DocumentSlot = {
  validation_status?: AnalysisStatus | string | null;
  number?: string | null;
  issuing_agency?: string | null;
  front_photo?: string | null;
  back_photo?: string | null;
  full_photo?: string | null;
  [k: string]: unknown;
};

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
  photo?: string | null;
  hub_whatsapp?: string | null;
  [k: string]: unknown;
};

export type AddressProofBlock = {
  exists: boolean;
  photo: string | null;
  status: "pending" | "approved" | "rejected" | "review" | "needs_kinship" | null;
  reason: string | null;
  needs_kinship: boolean;
  kinship_relation: string | null;
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

export type CandidateMe = {
  status: CandidateStatus;
  profile: ProfileSection | null;
  address: AddressSection | null;
  address_proof?: AddressProofBlock | null;
  documents?: DocumentsBlock | null;
  selfie?: SelfieSection | null;
  pix_validated?: boolean;
  blocks?: ValidationBlock[];
};

export type ClassifyResult = {
  is_document?: boolean | null;
  doc_type?: string | null;
  completeness?: "front" | "back" | "full" | null;
  is_legible?: boolean | null;
  reason?: string | null;
};

export type ContractInfo = {
  version: string;
  title: string;
  text: string;
  effective_date?: string;
  terms?: string[];
};

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

  // Candidate / KYC Onboarding
  async getCandidateMe(): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/me");
  },

  async getCandidateDocument(): Promise<DocumentSection> {
    return requestCollaborator<DocumentSection>("/candidate/document");
  },

  async classifyDocument(file: File | Blob): Promise<ClassifyResult> {
    const formData = new FormData();
    formData.append("file", file);
    return requestCollaborator<ClassifyResult>("/candidate/documents/classify", {
      method: "POST",
      body: formData,
    });
  },

  async uploadDocumentPhoto(slot: string, file: File | Blob): Promise<{ ok?: boolean; detail?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return requestCollaborator<{ ok?: boolean; detail?: string }>(`/candidate/documents/photo/${slot}`, {
      method: "POST",
      body: formData,
    });
  },

  async setCandidateDocuments(data: Record<string, unknown>): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/documents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async patchCandidateDocuments(data: Record<string, unknown>): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/document", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async getCandidateAddress(): Promise<Record<string, unknown>> {
    return requestCollaborator("/candidate/address");
  },

  async setCandidateAddressCep(cep: string): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/address", {
      method: "POST",
      body: JSON.stringify({ cep }),
    });
  },

  async patchCandidateAddress(data: Record<string, unknown>): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/address", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async uploadAddressProof(file: File | Blob): Promise<CandidateMe> {
    const formData = new FormData();
    formData.append("file", file);
    return requestCollaborator<CandidateMe>("/candidate/documents/address-proof", {
      method: "POST",
      body: formData,
    });
  },

  async submitAddressProofKinship(relation: string): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/documents/address-proof/kinship", {
      method: "POST",
      body: JSON.stringify({ relation }),
    });
  },

  async setCandidatePix(key: string, key_type: string): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/pix", {
      method: "POST",
      body: JSON.stringify({ key, key_type }),
    });
  },

  async setCandidateEducation(data: Record<string, unknown>): Promise<CandidateMe> {
    return requestCollaborator<CandidateMe>("/candidate/education", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async uploadCandidateSelfie(file: File | Blob): Promise<{ ok?: boolean; detail?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return requestCollaborator<{ ok?: boolean; detail?: string }>("/candidate/selfie", {
      method: "POST",
      body: formData,
    });
  },

  async getCurrentContract(): Promise<ContractInfo> {
    return requestCollaborator<ContractInfo>("/contract/current");
  },

  async getCandidateSelfie(): Promise<SelfieSection> {
    return requestCollaborator<SelfieSection>("/candidate/selfie");
  },
};
