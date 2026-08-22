import { getAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isPostgresConfigured } from "@/lib/db/pg";
import { memoryStore } from "@/lib/store/memory";
import { pgStore } from "@/lib/store/pg";
import type {
  Approval,
  Campaign,
  DashboardStats,
  Lead,
  LeadSource,
  LeadStatus,
  Message,
} from "@/lib/types";

type Backend = "postgres" | "supabase" | "memory";

export function getStoreBackend(): Backend {
  if (isPostgresConfigured()) return "postgres";
  if (isSupabaseConfigured()) return "supabase";
  return "memory";
}

export function usingMemoryStore() {
  return getStoreBackend() === "memory";
}

function active() {
  const backend = getStoreBackend();
  if (backend === "postgres") return pgStore;
  if (backend === "memory") return memoryStore;
  return null;
}

export const store = {
  usingMemory: usingMemoryStore,
  backend: getStoreBackend,

  async listLeads(filters?: { status?: LeadStatus }): Promise<Lead[]> {
    const local = active();
    if (local) return local.listLeads(filters);
    const sb = getAdminClient();
    let q = sb.from("leads").select("*").order("created_at", { ascending: false });
    if (filters?.status) q = q.eq("status", filters.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Lead[];
  },

  async getLead(id: string): Promise<Lead | null> {
    const local = active();
    if (local) return local.getLead(id);
    const { data, error } = await getAdminClient()
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Lead | null;
  },

  async getLeadByEmail(email: string): Promise<Lead | null> {
    const local = active();
    if (local) return local.getLeadByEmail(email);
    const { data, error } = await getAdminClient()
      .from("leads")
      .select("*")
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as Lead | null;
  },

  async createLead(
    input: Partial<Lead> & { source?: LeadSource },
  ): Promise<Lead> {
    const local = active();
    if (local) return local.createLead(input);
    const { data, error } = await getAdminClient()
      .from("leads")
      .insert({
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
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Lead;
  },

  async updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
    const local = active();
    if (local) return local.updateLead(id, patch);
    const { data, error } = await getAdminClient()
      .from("leads")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as Lead | null;
  },

  async listMessages(leadId: string): Promise<Message[]> {
    const local = active();
    if (local) return local.listMessages(leadId);
    const { data, error } = await getAdminClient()
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Message[];
  },

  async createMessage(
    input: Omit<Message, "id" | "created_at" | "meta"> & {
      meta?: Record<string, unknown>;
    },
  ): Promise<Message> {
    const local = active();
    if (local) return local.createMessage(input);
    const { data, error } = await getAdminClient()
      .from("messages")
      .insert({
        lead_id: input.lead_id,
        direction: input.direction,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
        agent: input.agent,
        meta: input.meta ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Message;
  },

  async listApprovals(status?: Approval["status"]): Promise<Approval[]> {
    const local = active();
    if (local) return local.listApprovals(status);
    let q = getAdminClient()
      .from("approvals")
      .select("*")
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Approval[];
  },

  async getApproval(id: string): Promise<Approval | null> {
    const local = active();
    if (local) return local.getApproval(id);
    const { data, error } = await getAdminClient()
      .from("approvals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Approval | null;
  },

  async createApproval(
    input: Omit<Approval, "id" | "created_at" | "resolved_at" | "status"> & {
      status?: Approval["status"];
    },
  ): Promise<Approval> {
    const local = active();
    if (local) return local.createApproval(input);
    const { data, error } = await getAdminClient()
      .from("approvals")
      .insert({
        lead_id: input.lead_id,
        message_id: input.message_id ?? null,
        status: input.status ?? "pending",
        kind: input.kind,
        subject: input.subject,
        body: input.body,
        to_email: input.to_email,
        from_email: input.from_email ?? null,
        agent: input.agent,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Approval;
  },

  async updateApproval(
    id: string,
    patch: Partial<Approval>,
  ): Promise<Approval | null> {
    const local = active();
    if (local) return local.updateApproval(id, patch);
    const { data, error } = await getAdminClient()
      .from("approvals")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as Approval | null;
  },

  async listCampaigns(): Promise<Campaign[]> {
    const local = active();
    if (local) return local.listCampaigns();
    const { data, error } = await getAdminClient()
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Campaign[];
  },

  async createCampaign(
    input: Omit<Campaign, "id" | "created_at" | "updated_at">,
  ): Promise<Campaign> {
    const local = active();
    if (local) return local.createCampaign(input);
    const { data, error } = await getAdminClient()
      .from("campaigns")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data as Campaign;
  },

  async createEvent(input: {
    agent: string;
    event_type: string;
    lead_id?: string | null;
    payload?: Record<string, unknown>;
  }) {
    const local = active();
    if (local) {
      return local.createEvent({
        agent: input.agent,
        event_type: input.event_type,
        lead_id: input.lead_id ?? null,
        payload: input.payload ?? {},
      });
    }
    const { data, error } = await getAdminClient()
      .from("agent_events")
      .insert({
        agent: input.agent,
        event_type: input.event_type,
        lead_id: input.lead_id ?? null,
        payload: input.payload ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listEvents(limit = 30) {
    const local = active();
    if (local) return local.listEvents(limit);
    const { data, error } = await getAdminClient()
      .from("agent_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async stats(): Promise<DashboardStats> {
    const local = active();
    if (local) return local.stats();
    const leads = await this.listLeads();
    const pending = (await this.listApprovals("pending")).length;
    const avg =
      leads.length === 0
        ? 0
        : Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length);
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
