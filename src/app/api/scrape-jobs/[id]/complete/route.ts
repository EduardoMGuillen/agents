import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    ok?: boolean;
    notes?: string;
    error?: string;
  };
  const current = (await store.listCampaigns()).find((c) => c.id === id);
  if (!current) {
    return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  }

  let notes = current.notes || "";
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    if (body.notes) Object.assign(parsed, JSON.parse(body.notes));
    if (body.error) parsed.error = body.error;
    notes = JSON.stringify(parsed);
  } catch {
    if (body.error) notes = body.error;
  }

  const campaign = await store.updateCampaign(id, {
    status: body.ok === false ? "error" : "done",
    notes,
  });
  return NextResponse.json({ campaign });
}
