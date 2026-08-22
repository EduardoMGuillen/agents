export type LeadStatus =
  | "new"
  | "contacted"
  | "replied"
  | "qualified"
  | "handed_off"
  | "won"
  | "lost";

export type LeadSource =
  | "website_form"
  | "manual"
  | "csv_import"
  | "marketing_agent"
  | "referral"
  | "other";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "sent";

export type MessageDirection = "outbound" | "inbound" | "internal";

export interface LeadQualification {
  hasWebsite?: boolean | null;
  budgetHint?: string | null;
  timeline?: string | null;
  painPoint?: string | null;
  readyForCall?: boolean | null;
  summary?: string | null;
}

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  city: string | null;
  country: string;
  locale: "es" | "en";
  source: LeadSource;
  status: LeadStatus;
  score: number;
  niche: string | null;
  notes: string | null;
  qualification: LeadQualification;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  lead_id: string;
  direction: MessageDirection;
  channel: string;
  subject: string | null;
  body: string;
  agent: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Approval {
  id: string;
  lead_id: string;
  message_id: string | null;
  status: ApprovalStatus;
  kind: string;
  subject: string;
  body: string;
  to_email: string;
  from_email: string | null;
  agent: string;
  created_at: string;
  resolved_at: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  niche: string | null;
  city: string | null;
  country: string;
  locale: "es" | "en";
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentEvent {
  id: string;
  agent: string;
  event_type: string;
  lead_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  pendingApprovals: number;
  handedOff: number;
  won: number;
  avgScore: number;
}

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "replied",
  "qualified",
  "handed_off",
  "won",
  "lost",
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  replied: "Respondió",
  qualified: "Calificado",
  handed_off: "Para ti",
  won: "Ganado",
  lost: "Perdido",
};
