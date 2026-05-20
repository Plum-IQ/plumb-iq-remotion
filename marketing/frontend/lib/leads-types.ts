export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type LeadSource = "organic" | "referral" | "direct" | "social" | "paid" | "other";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: LeadSource;
  stage: LeadStage;
  score: number;
  notes?: string;
  tags?: string;
  form_id?: string;
  referrer_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface LeadCreate {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  notes?: string;
  tags?: string;
  form_id?: string;
  referrer_url?: string;
}

export interface LeadUpdate {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  stage?: LeadStage;
  notes?: string;
  tags?: string;
}

export interface LeadListResponse {
  leads: Lead[];
  total: number;
  page: number;
  per_page: number;
}

export type PipelineResponse = Record<LeadStage, Lead[]>;

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const STAGE_ORDER: LeadStage[] = [
  "new", "contacted", "qualified", "proposal", "won", "lost",
];

export function scoreLabel(score: number): "hot" | "warm" | "cold" {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}
