import { NextResponse } from "next/server";
import { draftAllFirstTouch } from "@/lib/agents/sales";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await draftAllFirstTouch();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
