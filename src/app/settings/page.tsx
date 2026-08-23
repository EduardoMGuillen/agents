"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [config, setConfig] = useState<{
    memoryMode: boolean;
    backend: string;
    postgres: boolean;
    supabase: boolean;
    resend: boolean;
    smtp: boolean;
    mail: boolean;
    llm: boolean;
    googlePlaces: boolean;
    site: string;
  } | null>(null);
  const [secrets, setSecrets] = useState<{ hasPassword: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setConfig(d.config));
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setSecrets)
      .catch(() => setSecrets({ hasPassword: true }));
  }, []);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://agents-office.vercel.app";

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="display text-2xl"
        >
          Setup
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Stack conectado: Postgres + SMTP (Gmail). Resend/OpenAI opcionales.
        </p>
      </div>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">Estado actual</h2>
        {!config ? (
          <p className="text-sm text-[var(--muted)]">Cargando…</p>
        ) : (
          <ul className="space-y-2 text-sm">
            <li>
              Backend:{" "}
              <span className="badge badge-accent">{config.backend}</span>
            </li>
            <li>Postgres: {config.postgres ? "✅" : "—"}</li>
            <li>SMTP: {config.smtp ? "✅" : "—"}</li>
            <li>Resend: {config.resend ? "✅" : "— (usando SMTP)"}</li>
            <li>OpenAI: {config.llm ? "✅" : "— (plantillas fallback)"}</li>
            <li>
              Google Maps:{" "}
              {config.googlePlaces ? "✅" : "— (falta GOOGLE_MAPS_API_KEY)"}
            </li>
            <li>
              Site:{" "}
              <a
                className="text-[var(--accent)]"
                href={config.site}
                target="_blank"
                rel="noreferrer"
              >
                {config.site}
              </a>
            </li>
          </ul>
        )}
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">Respuestas de email</h2>
        <p className="text-sm text-[var(--muted)]">
          Cuando contestan a hola@nexusglobalsuministros.com, Resend avisa al
          CRM: el lead pasa a Propuesta y te llega copia si tienes
          OWNER_NOTIFY_EMAIL. Si el reply cayó en Proton, pégalo en el lead o
          pulsa “Contestó → Propuesta”.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-[var(--bg)] p-3 text-xs text-[var(--muted)]">{`Resend → Webhooks → email.received
URL: ${origin}/api/webhooks/resend

DNS del dominio (si aún no está):
Tipo MX · @ · prioridad 10
inbound.resend.com`}</pre>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">Webhook del form (tu web)</h2>
        <pre className="overflow-x-auto rounded-xl bg-[var(--bg)] p-3 text-xs text-[var(--accent)]">
          {`${origin}/api/webhooks/form`}
        </pre>
        <p className="text-sm text-[var(--muted)]">
          Ya está cableado en el repo Nexus (`/api/contact` → Office). En
          producción pon{" "}
          <code>NEXUS_OFFICE_WEBHOOK_URL</code> apuntando a esta URL.
        </p>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">Flujo diario</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>Marketing → genera prospectos</li>
          <li>Completa emails faltantes</li>
          <li>Lead → Sales: primer email → Approvals → Aprobar (SMTP envía)</li>
          <li>Si responden el mail → entra al lead + draft en Approvals, y te llega copia a Proton</li>
          <li>Entregar a Eduardo → cotizas y construyes</li>
        </ol>
      </section>

      {secrets && (
        <p className="text-xs text-[var(--muted)]">
          Auth panel: {secrets.hasPassword ? "activo" : "abierto"}
        </p>
      )}
    </div>
  );
}
