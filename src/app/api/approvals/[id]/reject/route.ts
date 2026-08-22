import { NextResponse } from "next/server";
import { rejectApproval } from "@/lib/agents/approvals";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  try {
    const approval = await rejectApproval(id, body.reason);
    return NextResponse.json({ approval });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
