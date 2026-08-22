import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";

const createSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  locale: z.enum(["es", "en"]).optional(),
  source: z
    .enum([
      "website_form",
      "manual",
      "csv_import",
      "marketing_agent",
      "referral",
      "other",
    ])
    .optional(),
  niche: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  score: z.number().min(0).max(100).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as
    | "new"
    | "contacted"
    | "replied"
    | "qualified"
    | "handed_off"
    | "won"
    | "lost"
    | null;

  const leads = await store.listLeads(
    status ? { status } : undefined,
  );
  return NextResponse.json({ leads, memoryMode: store.usingMemory() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const lead = await store.createLead(parsed.data);
  await store.createEvent({
    agent: "system",
    event_type: "lead_created",
    lead_id: lead.id,
    payload: { source: lead.source },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
