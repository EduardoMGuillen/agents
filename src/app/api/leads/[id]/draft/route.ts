import { NextResponse } from "next/server";
import { draftSalesOutreach, draftSalesReply } from "@/lib/agents/sales";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    mode?: "first_touch" | "reply";
    inbound?: string;
  };

  try {
    if (body.mode === "reply") {
      if (!body.inbound?.trim()) {
        return NextResponse.json(
          { error: "Falta inbound message" },
          { status: 400 },
        );
      }
      const result = await draftSalesReply(id, body.inbound);
      return NextResponse.json(result);
    }

    const result = await draftSalesOutreach(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
