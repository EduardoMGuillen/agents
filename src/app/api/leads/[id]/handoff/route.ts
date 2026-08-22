import { NextResponse } from "next/server";
import { handoffLead } from "@/lib/agents/sales";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };

  try {
    const lead = await handoffLead(id, body.note);
    return NextResponse.json({ lead });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
