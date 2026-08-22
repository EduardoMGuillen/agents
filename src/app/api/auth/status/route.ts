import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasPassword: Boolean(process.env.DASHBOARD_PASSWORD),
  });
}
