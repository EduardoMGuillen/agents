import { randomUUID } from "crypto";
import { query } from "@/lib/db/pg";
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

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    name: (row.name as string) ?? null,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    company: (row.company as string) ?? null,
    website: (row.website as string) ?? null,
    city: (row.city as string) ?? null,
    country: String(row.country ?? "MX"),
    locale: (row.locale as "es" | "en") ?? "es",
    source: row.source as LeadSource,
    status: row.status as LeadStatus,
    score: Number(row.score ?? 0),
    niche: (row.niche as string) ?? null,
    notes: (row.notes as string) ?? null,
    qualification: (row.qualification as Lead["qualification"]) ?? {},
    assigned_to: String(row.assigned_to ?? "sales_agent"),
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  };
}

export const pgStore = {
  async listLeads(filters?: { status?: LeadStatus }) {
    if (filters?.status) {
      const { rows } = await query(
        `select * from leads where status = $1 order by created_at desc`,
        [filters.status],
      );
      return rows.map(mapLead);
    }
    const { rows } = await query(
      `select * from leads order by created_at desc`,
    );
    return rows.map(mapLead);
  },

  async getLead(id: string) {
    const { rows } = await query(`select * from leads where id = $1`, [id]);
    return rows[0] ? mapLead(rows[0]) : null;
  },

  async getLeadByEmail(email: string) {
    const { rows } = await query(
      `select * from leads where lower(email) = lower($1) order by updated_at desc limit 1`,
      [email],
    );
    return rows[0] ? mapLead(rows[0]) : null;
  },

  async createLead(input: Partial<Lead> & { source?: LeadSource }) {
    const id = randomUUID();
    const { rows } = await query(
      `insert into leads (
        id, name, email, phone, company, website, city, country, locale,
        source, status, score, niche, notes, qualification, assigned_to
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15::jsonb,$16
      ) returning *`,
      [
        id,
        input.name ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.company ?? null,
        input.website ?? null,
        input.city ?? null,
        input.country ?? "MX",
        input.locale ?? "es",
        input.source ?? "manual",
        input.status ?? "new",
        input.score ?? 0,
        input.niche ?? null,
        input.notes ?? null,
        JSON.stringify(input.qualification ?? {}),
        input.assigned_to ?? "sales_agent",
      ],
    );
    return mapLead(rows[0]);
  },

  async updateLead(id: string, patch: Partial<Lead>) {
    const current = await this.getLead(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    const { rows } = await query(
      `update leads set
        name=$2, email=$3, phone=$4, company=$5, website=$6, city=$7,
        country=$8, locale=$9, source=$10, status=$11, score=$12, niche=$13,
        notes=$14, qualification=$15::jsonb, assigned_to=$16, updated_at=now()
       where id=$1 returning *`,
      [
        id,
        next.name,
        next.email,
        next.phone,
        next.company,
        next.website,
        next.city,
        next.country,
        next.locale,
        next.source,
        next.status,
        next.score,
        next.niche,
        next.notes,
        JSON.stringify(next.qualification ?? {}),
        next.assigned_to,
      ],
    );
    return rows[0] ? mapLead(rows[0]) : null;
  },

  async listMessages(leadId: string) {
    const { rows } = await query(
      `select * from messages where lead_id = $1 order by created_at asc`,
      [leadId],
    );
    return rows.map((row) => ({
      id: String(row.id),
      lead_id: String(row.lead_id),
      direction: row.direction,
      channel: String(row.channel),
      subject: (row.subject as string) ?? null,
      body: String(row.body),
      agent: (row.agent as string) ?? null,
      meta: (row.meta as Record<string, unknown>) ?? {},
      created_at: new Date(String(row.created_at)).toISOString(),
    })) as Message[];
  },

  async createMessage(
    input: Omit<Message, "id" | "created_at" | "meta"> & {
      meta?: Record<string, unknown>;
    },
  ) {
    const { rows } = await query(
      `insert into messages (id, lead_id, direction, channel, subject, body, agent, meta)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) returning *`,
      [
        randomUUID(),
        input.lead_id,
        input.direction,
        input.channel,
        input.subject,
        input.body,
        input.agent,
        JSON.stringify(input.meta ?? {}),
      ],
    );
    const row = rows[0];
    return {
      id: String(row.id),
      lead_id: String(row.lead_id),
      direction: row.direction,
      channel: String(row.channel),
      subject: (row.subject as string) ?? null,
      body: String(row.body),
      agent: (row.agent as string) ?? null,
      meta: (row.meta as Record<string, unknown>) ?? {},
      created_at: new Date(String(row.created_at)).toISOString(),
    } as Message;
  },

  async listApprovals(status?: Approval["status"]) {
    const res = status
      ? await query(
          `select * from approvals where status = $1 order by created_at desc`,
          [status],
        )
      : await query(`select * from approvals order by created_at desc`);
    return res.rows.map((row) => ({
      id: String(row.id),
      lead_id: String(row.lead_id),
      message_id: row.message_id ? String(row.message_id) : null,
      status: row.status,
      kind: String(row.kind),
      subject: String(row.subject),
      body: String(row.body),
      to_email: String(row.to_email),
      from_email: (row.from_email as string) ?? null,
      agent: String(row.agent),
      created_at: new Date(String(row.created_at)).toISOString(),
      resolved_at: row.resolved_at
        ? new Date(String(row.resolved_at)).toISOString()
        : null,
    })) as Approval[];
  },

  async getApproval(id: string) {
    const { rows } = await query(`select * from approvals where id = $1`, [id]);
    if (!rows[0]) return null;
    const list = await this.listApprovals();
    return list.find((a) => a.id === id) ?? null;
  },

  async createApproval(
    input: Omit<Approval, "id" | "created_at" | "resolved_at" | "status"> & {
      status?: Approval["status"];
    },
  ) {
    const { rows } = await query(
      `insert into approvals (
        id, lead_id, message_id, status, kind, subject, body, to_email, from_email, agent
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [
        randomUUID(),
        input.lead_id,
        input.message_id ?? null,
        input.status ?? "pending",
        input.kind,
        input.subject,
        input.body,
        input.to_email,
        input.from_email ?? null,
        input.agent,
      ],
    );
    const id = String(rows[0].id);
    return (await this.getApproval(id))!;
  },

  async updateApproval(id: string, patch: Partial<Approval>) {
    const current = await this.getApproval(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    await query(
      `update approvals set
        message_id=$2, status=$3, kind=$4, subject=$5, body=$6,
        to_email=$7, from_email=$8, agent=$9, resolved_at=$10
       where id=$1`,
      [
        id,
        next.message_id,
        next.status,
        next.kind,
        next.subject,
        next.body,
        next.to_email,
        next.from_email,
        next.agent,
        next.resolved_at,
      ],
    );
    return this.getApproval(id);
  },

  async listCampaigns() {
    const { rows } = await query(
      `select * from campaigns order by created_at desc`,
    );
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      niche: (row.niche as string) ?? null,
      city: (row.city as string) ?? null,
      country: String(row.country ?? "MX"),
      locale: (row.locale as "es" | "en") ?? "es",
      status: String(row.status),
      notes: (row.notes as string) ?? null,
      created_at: new Date(String(row.created_at)).toISOString(),
      updated_at: new Date(String(row.updated_at)).toISOString(),
    })) as Campaign[];
  },

  async createCampaign(
    input: Omit<Campaign, "id" | "created_at" | "updated_at">,
  ) {
    const { rows } = await query(
      `insert into campaigns (id, name, niche, city, country, locale, status, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [
        randomUUID(),
        input.name,
        input.niche,
        input.city,
        input.country,
        input.locale,
        input.status,
        input.notes,
      ],
    );
    const row = rows[0];
    return {
      id: String(row.id),
      name: String(row.name),
      niche: (row.niche as string) ?? null,
      city: (row.city as string) ?? null,
      country: String(row.country ?? "MX"),
      locale: (row.locale as "es" | "en") ?? "es",
      status: String(row.status),
      notes: (row.notes as string) ?? null,
      created_at: new Date(String(row.created_at)).toISOString(),
      updated_at: new Date(String(row.updated_at)).toISOString(),
    } as Campaign;
  },

  async updateCampaign(
    id: string,
    patch: Partial<Pick<Campaign, "status" | "notes" | "name">>,
  ) {
    const next = await this.listCampaigns().then((rows) =>
      rows.find((c) => c.id === id),
    );
    if (!next) return null;
    await query(
      `update campaigns set name=$2, status=$3, notes=$4, updated_at=now() where id=$1`,
      [
        id,
        patch.name ?? next.name,
        patch.status ?? next.status,
        patch.notes ?? next.notes,
      ],
    );
    const { rows } = await query(`select * from campaigns where id=$1`, [id]);
    const row = rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      niche: (row.niche as string) ?? null,
      city: (row.city as string) ?? null,
      country: String(row.country ?? "MX"),
      locale: (row.locale as "es" | "en") ?? "es",
      status: String(row.status),
      notes: (row.notes as string) ?? null,
      created_at: new Date(String(row.created_at)).toISOString(),
      updated_at: new Date(String(row.updated_at)).toISOString(),
    } as Campaign;
  },

  async createEvent(input: {
    agent: string;
    event_type: string;
    lead_id?: string | null;
    payload?: Record<string, unknown>;
  }) {
    const { rows } = await query(
      `insert into agent_events (id, agent, event_type, lead_id, payload)
       values ($1,$2,$3,$4,$5::jsonb) returning *`,
      [
        randomUUID(),
        input.agent,
        input.event_type,
        input.lead_id ?? null,
        JSON.stringify(input.payload ?? {}),
      ],
    );
    const row = rows[0];
    return {
      id: String(row.id),
      agent: String(row.agent),
      event_type: String(row.event_type),
      lead_id: row.lead_id ? String(row.lead_id) : null,
      payload: (row.payload as Record<string, unknown>) ?? {},
      created_at: new Date(String(row.created_at)).toISOString(),
    } as AgentEvent;
  },

  async listEvents(limit = 30) {
    const { rows } = await query(
      `select * from agent_events order by created_at desc limit $1`,
      [limit],
    );
    return rows.map((row) => ({
      id: String(row.id),
      agent: String(row.agent),
      event_type: String(row.event_type),
      lead_id: row.lead_id ? String(row.lead_id) : null,
      payload: (row.payload as Record<string, unknown>) ?? {},
      created_at: new Date(String(row.created_at)).toISOString(),
    })) as AgentEvent[];
  },

  async stats(): Promise<DashboardStats> {
    const leads = await this.listLeads();
    const pending = (await this.listApprovals("pending")).length;
    const avg =
      leads.length === 0
        ? 0
        : Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length);
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
