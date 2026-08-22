import { NextResponse } from "next/server";
import { Resend } from "resend";
import { ingestInboundReply } from "@/lib/agents/sales";

export const runtime = "nodejs";

function parseFrom(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (secret) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.webhooks.verify({
        webhookSecret: secret,
        payload: raw,
        headers: {
          id: req.headers.get("svix-id") ?? "",
          timestamp: req.headers.get("svix-timestamp") ?? "",
          signature: req.headers.get("svix-signature") ?? "",
        },
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = JSON.parse(raw) as {
    type?: string;
    data?: {
      email_id?: string;
      from?: string;
      to?: string[];
      subject?: string;
    };
  };

  if (event.type && event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const emailId = event.data?.email_id;
  let from = parseFrom(event.data?.from);
  let subject = event.data?.subject ?? null;
  let body = "";
  const to = event.data?.to ?? [];

  if (emailId && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const received = await resend.emails.receiving.get(emailId);
    const data = received.data as {
      from?: string;
      subject?: string;
      text?: string | null;
      html?: string | null;
    } | null;
    if (data) {
      from = data.from || from;
      subject = data.subject ?? subject;
      body = (data.text || data.html || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (!from) {
    return NextResponse.json({ error: "Missing from" }, { status: 400 });
  }

  if (!body) {
    body = `(Email recibido${subject ? `: ${subject}` : ""} — sin cuerpo de texto)`;
  }

  const result = await ingestInboundReply({
    from,
    to,
    subject,
    body,
    resendEmailId: emailId,
  });

  return NextResponse.json({ ok: true, result });
}
