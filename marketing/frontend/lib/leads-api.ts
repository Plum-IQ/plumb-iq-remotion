import type {
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadListResponse,
  PipelineResponse,
  LeadStage,
  LeadSource,
} from "./leads-types";

// Set NEXT_PUBLIC_API_URL in your .env
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const leadsApi = {
  create(data: LeadCreate): Promise<Lead> {
    return request("/leads/", { method: "POST", body: JSON.stringify(data) });
  },

  list(params?: {
    stage?: LeadStage;
    source?: LeadSource;
    min_score?: number;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<LeadListResponse> {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) qs.set(k, String(v));
      });
    }
    return request(`/leads/?${qs}`);
  },

  pipeline(): Promise<PipelineResponse> {
    return request("/leads/pipeline");
  },

  get(id: string): Promise<Lead> {
    return request(`/leads/${id}`);
  },

  update(id: string, data: LeadUpdate): Promise<Lead> {
    return request(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  delete(id: string): Promise<void> {
    return request(`/leads/${id}`, { method: "DELETE" });
  },
};
