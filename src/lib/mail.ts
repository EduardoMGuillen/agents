import nodemailer from "nodemailer";
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
  return isResendConfigured() || isSmtpConfigured();
}

export function getFromEmail() {
  if (process.env.RESEND_FROM_EMAIL) return process.env.RESEND_FROM_EMAIL;
  if (process.env.SMTP_USER) {
    return `Nexus Global <${process.env.SMTP_USER}>`;
  }
  return "Nexus Global <onboarding@resend.dev>";
}

export function textToHtml(body: string) {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;white-space:pre-wrap">${escaped}</div>`;
}

async function sendViaSmtp(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: getFromEmail(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo || process.env.OWNER_NOTIFY_EMAIL || undefined,
  });

  return {
    ok: true as const,
    simulated: false as const,
    id: info.messageId,
    provider: "smtp" as const,
  };
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
    replyTo: params.replyTo,
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
  if (isResendConfigured()) {
    const result = await sendViaResend(params);
    if (result.ok) return result;
    if (isSmtpConfigured()) {
      try {
        return await sendViaSmtp(params);
      } catch (e) {
        return {
          ok: false as const,
          simulated: false as const,
          error:
            (result.error || "Resend failed") +
            " / SMTP: " +
            (e instanceof Error ? e.message : "error"),
          provider: "none" as const,
        };
      }
    }
    return result;
  }

  if (isSmtpConfigured()) {
    try {
      return await sendViaSmtp(params);
    } catch (e) {
      return {
        ok: false as const,
        simulated: false as const,
        error: e instanceof Error ? e.message : "SMTP error",
        provider: "smtp" as const,
      };
    }
  }

  return {
    ok: false as const,
    simulated: true as const,
    id: `sim_${Date.now()}`,
    error: "Sin Resend ni SMTP — email simulado",
    provider: "none" as const,
  };
}

/** @deprecated use sendEmail */
export const isMailReady = isMailConfigured;
