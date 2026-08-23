import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "nexus_office_session";

export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const workerSecret =
    process.env.SCRAPER_SECRET?.trim() ||
    process.env.FORM_WEBHOOK_SECRET?.trim();
  if (
    workerSecret &&
    pathname === "/api/leads/import" &&
    req.headers.get("x-nexus-worker-secret") === workerSecret
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get(COOKIE)?.value;
  if (session === password) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
