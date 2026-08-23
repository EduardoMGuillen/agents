import { randomUUID } from "crypto";
import type {
  AgentEvent,
  Approval,
  Campaign,
  DashboardStats,
  Lead,
  LeadSource,
  LeadStatus,
  Message,
} from "@/lib/types";

type DbShape = {
  leads: Lead[];
  messages: Message[];
  approvals: Approval[];
  campaigns: Campaign[];
  events: AgentEvent[];
};

declare global {
  // eslint-disable-next-line no-var
  var __nexusMemoryDb: DbShape | undefined;
}

function db(): DbShape {
  if (!globalThis.__nexusMemoryDb) {
    globalThis.__nexusMemoryDb = {
      leads: [],
      messages: [],
      approvals: [],
      campaigns: [],
      events: [],
    };
  }
  return globalThis.__nexusMemoryDb;
}

function now() {
  return new Date().toISOString();
}

export const memoryStore = {
  async listLeads(filters?: { status?: LeadStatus }) {
    let rows = [...db().leads].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
    if (filters?.status) rows = rows.filter((l) => l.status === filters.status);
    return rows;
  },

  async getLead(id: string) {
    return db().leads.find((l) => l.id === id) ?? null;
  },

  async getLeadByEmail(email: string) {
    const needle = email.toLowerCase();
    return (
      db().leads.find((l) => (l.email || "").toLowerCase() === needle) ?? null
    );
  },

  async createLead(
    input: Partial<Lead> & { source?: LeadSource },
  ): Promise<Lead> {
    const ts = now();
    const lead: Lead = {
      id: randomUUID(),
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      website: input.website ?? null,
      city: input.city ?? null,
      country: input.country ?? "MX",
      locale: input.locale ?? "es",
      source: input.source ?? "manual",
      status: input.status ?? "new",
      score: input.score ?? 0,
      niche: input.niche ?? null,
      notes: input.notes ?? null,
      qualification: input.qualification ?? {},
      assigned_to: input.assigned_to ?? "sales_agent",
      created_at: ts,
      updated_at: ts,
    };
    db().leads.unshift(lead);
    return lead;
  },

  async updateLead(id: string, patch: Partial<Lead>) {
    const lead = db().leads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, patch, { updated_at: now() });
    return lead;
  },

  async listMessages(leadId: string) {
    return db()
      .messages.filter((m) => m.lead_id === leadId)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  },

  async createMessage(
    input: Omit<Message, "id" | "created_at" | "meta"> & {
      meta?: Record<string, unknown>;
    },
  ) {
    const message: Message = {
      id: randomUUID(),
      meta: input.meta ?? {},
      created_at: now(),
      lead_id: input.lead_id,
      direction: input.direction,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      agent: input.agent,
    };
    db().messages.push(message);
    return message;
  },

  async listApprovals(status?: Approval["status"]) {
    let rows = [...db().approvals].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
    if (status) rows = rows.filter((a) => a.status === status);
    return rows;
  },

  async getApproval(id: string) {
    return db().approvals.find((a) => a.id === id) ?? null;
  },

  async createApproval(
    input: Omit<Approval, "id" | "created_at" | "resolved_at" | "status"> & {
      status?: Approval["status"];
    },
  ) {
    const approval: Approval = {
      id: randomUUID(),
      status: input.status ?? "pending",
      created_at: now(),
      resolved_at: null,
      lead_id: input.lead_id,
      message_id: input.message_id ?? null,
      kind: input.kind,
      subject: input.subject,
      body: input.body,
      to_email: input.to_email,
      from_email: input.from_email ?? null,
      agent: input.agent,
    };
    db().approvals.unshift(approval);
    return approval;
  },

  async updateApproval(id: string, patch: Partial<Approval>) {
    const row = db().approvals.find((a) => a.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  },

  async listCampaigns() {
    return [...db().campaigns].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
  },

  async createCampaign(
    input: Omit<Campaign, "id" | "created_at" | "updated_at">,
  ) {
    const ts = now();
    const campaign: Campaign = {
      ...input,
      id: randomUUID(),
      created_at: ts,
      updated_at: ts,
    };
    db().campaigns.unshift(campaign);
    return campaign;
  },

  async updateCampaign(
    id: string,
    patch: Partial<Pick<Campaign, "status" | "notes" | "name">>,
  ) {
    const row = db().campaigns.find((c) => c.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: now() });
    return row;
  },

  async createEvent(
    input: Omit<AgentEvent, "id" | "created_at">,
  ): Promise<AgentEvent> {
    const event: AgentEvent = {
      ...input,
      id: randomUUID(),
      created_at: now(),
    };
    db().events.unshift(event);
    return event;
  },

  async listEvents(limit = 30) {
    return db().events.slice(0, limit);
  },

  async stats(): Promise<DashboardStats> {
    const leads = db().leads;
    const pending = db().approvals.filter((a) => a.status === "pending").length;
    const avg =
      leads.length === 0
        ? 0
        : Math.round(
            leads.reduce((sum, l) => sum + l.score, 0) / leads.length,
          );
    return {
      totalLeads: leads.length,
      newLeads: leads.filter((l) => l.status === "new").length,
      pendingApprovals: pending,
      handedOff: leads.filter((l) => l.status === "handed_off").length,
      won: leads.filter((l) => l.status === "won").length,
      avgScore: avg,
    };
  },
};
