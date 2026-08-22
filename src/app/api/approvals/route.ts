import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") as
    | "pending"
    | "approved"
    | "rejected"
    | "sent"
    | null;
  const approvals = await store.listApprovals(status ?? undefined);
  return NextResponse.json({ approvals });
}
