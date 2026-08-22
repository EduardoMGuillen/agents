import { Resend } from "resend";

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

export function isMailConfigured() {
  return isResendConfigured();
}

export function getReplyToEmail() {
  return (
    process.env.INBOUND_REPLY_TO?.trim() ||
    process.env.OWNER_NOTIFY_EMAIL?.trim() ||
    undefined
  );
}

export function getFromEmail() {
  if (process.env.RESEND_FROM_EMAIL) return process.env.RESEND_FROM_EMAIL;
  return "Nexus Global <hola@nexusglobalsuministros.com>";
}

export function textToHtml(body: string) {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;white-space:pre-wrap">${escaped}</div>`;
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo || getReplyToEmail(),
  });

  if (error) {
    return {
      ok: false as const,
      simulated: false as const,
      error: error.message,
      provider: "resend" as const,
    };
  }

  return {
    ok: true as const,
    simulated: false as const,
    id: data?.id ?? null,
    provider: "resend" as const,
  };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!isResendConfigured()) {
    return {
      ok: false as const,
      simulated: true as const,
      id: `sim_${Date.now()}`,
      error: "Falta RESEND_API_KEY — no se envía (solo Resend)",
      provider: "none" as const,
    };
  }

  return sendViaResend(params);
}

/** @deprecated use sendEmail */
export const isMailReady = isMailConfigured;
