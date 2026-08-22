import { chatJson, isLlmConfigured } from "@/lib/llm";
import { store } from "@/lib/store";
import {
  NEXUS_SITE,
  SALES_SYSTEM_EN,
  SALES_SYSTEM_ES,
  salesDraftFallback,
  salesReplyFallback,
} from "@/lib/agents/prompts";
import type { Lead } from "@/lib/types";
import { getFromEmail } from "@/lib/mail";

export type SalesDraftResult = {
  subject: string;
  body: string;
  score: number;
  readyForHandoff: boolean;
  qualificationNotes: string;
};

async function generateWithLlm(
  lead: Lead,
  mode: "first_touch" | "reply",
  inbound?: string,
): Promise<SalesDraftResult> {
  const system = lead.locale === "en" ? SALES_SYSTEM_EN : SALES_SYSTEM_ES;
  const user = JSON.stringify(
    {
      mode,
      nexusSite: NEXUS_SITE,
      lead: {
        name: lead.name,
        email: lead.email,
        company: lead.company,
        website: lead.website,
        city: lead.city,
        country: lead.country,
        niche: lead.niche,
        notes: lead.notes,
        status: lead.status,
        score: lead.score,
        qualification: lead.qualification,
      },
      inboundMessage: inbound ?? null,
      outputSchema: {
        subject: "string",
        body: "string",
        score: "0-100",
        readyForHandoff: "boolean",
        qualificationNotes: "string",
      },
    },
    null,
    2,
  );

  return chatJson<SalesDraftResult>({ system, user });
}

export async function draftSalesOutreach(leadId: string) {
  const lead = await store.getLead(leadId);
  if (!lead) throw new Error("Lead no encontrado");
  if (!lead.email) throw new Error("El lead no tiene email");

  let draft: SalesDraftResult;
  try {
    draft = isLlmConfigured()
      ? await generateWithLlm(lead, "first_touch")
      : salesDraftFallback(lead);
  } catch {
    draft = salesDraftFallback(lead);
  }

  const approval = await store.createApproval({
    lead_id: lead.id,
    message_id: null,
    kind: "email",
    subject: draft.subject,
    body: draft.body,
    to_email: lead.email,
    from_email: getFromEmail(),
    agent: "sales_agent",
  });

  await store.updateLead(lead.id, {
    score: Math.max(lead.score, draft.score),
    qualification: {
      ...lead.qualification,
      summary: draft.qualificationNotes,
    },
  });

  await store.createEvent({
    agent: "sales_agent",
    event_type: "draft_created",
    lead_id: lead.id,
    payload: { approvalId: approval.id, mode: "first_touch" },
  });

  return { lead, approval, draft };
}

export async function draftSalesReply(
  leadId: string,
  inboundBody: string,
  options?: { skipPersistInbound?: boolean; subject?: string },
) {
  const lead = await store.getLead(leadId);
  if (!lead) throw new Error("Lead no encontrado");
  if (!lead.email) throw new Error("El lead no tiene email");

  if (!options?.skipPersistInbound) {
    await store.createMessage({
      lead_id: lead.id,
      direction: "inbound",
      channel: "email",
      subject: options?.subject ?? null,
      body: inboundBody,
      agent: null,
    });
  }

  let draft: SalesDraftResult;
  try {
    draft = isLlmConfigured()
      ? await generateWithLlm(lead, "reply", inboundBody)
      : salesReplyFallback(lead, inboundBody);
  } catch {
    draft = salesReplyFallback(lead, inboundBody);
  }

  const approval = await store.createApproval({
    lead_id: lead.id,
    message_id: null,
    kind: "email",
    subject: draft.subject,
    body: draft.body,
    to_email: lead.email,
    from_email: getFromEmail(),
    agent: "sales_agent",
  });

  const nextStatus =
    draft.readyForHandoff
      ? "qualified"
      : lead.status === "new"
        ? "replied"
        : lead.status;

  await store.updateLead(lead.id, {
    status: nextStatus,
    score: Math.max(lead.score, draft.score),
    qualification: {
      ...lead.qualification,
      summary: draft.qualificationNotes,
      readyForCall: draft.readyForHandoff,
    },
  });

  await store.createEvent({
    agent: "sales_agent",
    event_type: "reply_drafted",
    lead_id: lead.id,
    payload: {
      approvalId: approval.id,
      readyForHandoff: draft.readyForHandoff,
    },
  });

  return { lead: await store.getLead(lead.id), approval, draft };
}

export async function handoffLead(leadId: string, note?: string) {
  const lead = await store.getLead(leadId);
  if (!lead) throw new Error("Lead no encontrado");

  const updated = await store.updateLead(leadId, {
    status: "handed_off",
    assigned_to: "eduardo",
    score: Math.max(lead.score, 80),
    notes: [lead.notes, note].filter(Boolean).join("\n"),
    qualification: {
      ...lead.qualification,
      readyForCall: true,
      summary:
        lead.qualification.summary ??
        "Lead listo para cierre humano / desarrollo",
    },
  });

  await store.createMessage({
    lead_id: leadId,
    direction: "internal",
    channel: "system",
    subject: "Handoff a Eduardo",
    body:
      note ||
      "Sales Agent entregó este lead. Toca cotizar, cerrar y construir el website.",
    agent: "sales_agent",
  });

  await store.createEvent({
    agent: "sales_agent",
    event_type: "handoff",
    lead_id: leadId,
    payload: { note: note ?? null },
  });

  const notifyTo = process.env.OWNER_NOTIFY_EMAIL;
  if (notifyTo) {
    const { sendEmail, textToHtml } = await import("@/lib/mail");
    await sendEmail({
      to: notifyTo,
      subject: `[Nexus] Lead listo: ${lead.company || lead.name || lead.email}`,
      html: textToHtml(
        `Lead entregado para ti.\n\nNombre: ${lead.name}\nEmail: ${lead.email}\nEmpresa: ${lead.company}\nTel: ${lead.phone}\nScore: ${updated?.score}\n\nNotas:\n${note || lead.notes || "—"}`,
      ),
    });
  }

  return updated;
}

function extractEmail(raw: string) {
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] || raw).trim().toLowerCase();
}

export async function ingestInboundReply(input: {
  from: string;
  to?: string[];
  subject?: string | null;
  body: string;
  resendEmailId?: string;
}) {
  const fromEmail = extractEmail(input.from);
  const ours = [
    process.env.OWNER_NOTIFY_EMAIL,
    process.env.SMTP_USER,
    process.env.INBOUND_REPLY_TO,
    "hola@nexusglobalsuministros.com",
  ]
    .filter(Boolean)
    .map((e) => extractEmail(String(e)));

  if (ours.includes(fromEmail)) {
    return { skipped: true as const, reason: "self" };
  }

  let lead = await store.getLeadByEmail(fromEmail);
  if (!lead) {
    lead = await store.createLead({
      name: input.from.replace(/<.*?>/g, "").trim() || fromEmail,
      email: fromEmail,
      source: "other",
      status: "replied",
      score: 45,
      notes: `Inbound email: ${input.subject || "(sin asunto)"}`,
    });
  }

  await store.createMessage({
    lead_id: lead.id,
    direction: "inbound",
    channel: "email",
    subject: input.subject ?? null,
    body: input.body,
    agent: null,
    meta: { resendEmailId: input.resendEmailId ?? null, to: input.to ?? [] },
  });

  const { approval, draft } = await draftSalesReply(lead.id, input.body, {
    skipPersistInbound: true,
    subject: input.subject ?? undefined,
  });

  const notifyTo = process.env.OWNER_NOTIFY_EMAIL;
  if (notifyTo) {
    const { sendEmail, textToHtml } = await import("@/lib/mail");
    await sendEmail({
      to: notifyTo,
      subject: `[Nexus] Respuesta de ${lead.company || lead.name || fromEmail}`,
      html: textToHtml(
        `El lead contestó el email.\n\nDe: ${fromEmail}\nAsunto: ${input.subject || "—"}\n\n${input.body}\n\nSales Agent ya dejó un draft en Approvals.\nLead: ${lead.id}`,
      ),
      replyTo: fromEmail,
    });
  }

  return {
    skipped: false as const,
    leadId: lead.id,
    approvalId: approval.id,
    readyForHandoff: draft.readyForHandoff,
  };
}

