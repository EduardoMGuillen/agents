import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import { draftSalesOutreach } from "@/lib/agents/sales";
import { localeFromCountry, normalizeCountry } from "@/lib/locale";

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().optional(),
  locale: z.enum(["es", "en"]).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  autoDraft: z.boolean().optional().default(true),
});

/**
 * Webhook for nexusglobalsuministros.com contact form.
 * POST JSON or form-urlencoded. Optional header x-nexus-webhook-secret.
 */
export async function POST(req: Request) {
  const secret = process.env.FORM_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-nexus-webhook-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const contentType = req.headers.get("content-type") || "";
  let raw: Record<string, unknown> = {};

  if (contentType.includes("application/json")) {
    raw = await req.json();
  } else {
    const form = await req.formData();
    raw = Object.fromEntries(form.entries());
  }

  const parsed = schema.safeParse({
    name: raw.name || raw.Nombre,
    email: raw.email || raw.Email,
    phone: raw.phone || raw.telefono || raw.Teléfono,
    company: raw.company || raw.empresa,
    message: raw.message || raw.mensaje || raw.Mensaje,
    locale: raw.locale || "es",
    city: raw.city,
    country: raw.country || "MX",
    autoDraft: raw.autoDraft !== "false" && raw.autoDraft !== false,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const country = normalizeCountry(data.country || "MX");
  const lead = await store.createLead({
    name: data.name ?? null,
    email: data.email,
    phone: data.phone ?? null,
    company: data.company ?? null,
    city: data.city ?? null,
    country,
    locale: localeFromCountry(country),
    source: "website_form",
    status: "new",
    score: 50,
    notes: data.message ?? null,
  });

  if (data.message) {
    await store.createMessage({
      lead_id: lead.id,
      direction: "inbound",
      channel: "website_form",
      subject: "Formulario web Nexus",
      body: data.message,
      agent: null,
    });
  }

  await store.createEvent({
    agent: "system",
    event_type: "form_submission",
    lead_id: lead.id,
  });

  let draft = null;
  if (data.autoDraft) {
    try {
      draft = await draftSalesOutreach(lead.id);
    } catch {
      draft = null;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      leadId: lead.id,
      approvalId: draft?.approval.id ?? null,
    },
    { status: 201 },
  );
}
