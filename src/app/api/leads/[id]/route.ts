import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";

const patchSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().optional(),
  locale: z.enum(["es", "en"]).optional(),
  status: z
    .enum([
      "new",
      "contacted",
      "replied",
      "qualified",
      "handed_off",
      "won",
      "lost",
    ])
    .optional(),
  score: z.number().min(0).max(100).optional(),
  niche: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const lead = await store.getLead(id);
  if (!lead) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const messages = await store.listMessages(id);
  return NextResponse.json({ lead, messages });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const lead = await store.updateLead(id, parsed.data as { status?: LeadStatus });
  if (!lead) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}
