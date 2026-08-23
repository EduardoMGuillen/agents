import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  const job = await store.claimScraplingJob();
  if (!job) return NextResponse.json({ job: null });
  return NextResponse.json({ job });
}
