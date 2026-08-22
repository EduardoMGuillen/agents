import { NextResponse } from "next/server";
import { z } from "zod";
import { runMarketingProspect } from "@/lib/agents/marketing";

const schema = z.object({
  niche: z.string().min(2),
  city: z.string().min(2),
  country: z.string().optional(),
  locale: z.enum(["es", "en"]).optional(),
  count: z.number().min(1).max(8).optional(),
  campaignName: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await runMarketingProspect(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
