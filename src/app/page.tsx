"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
  stats: {
    totalLeads: number;
    newLeads: number;
    pendingApprovals: number;
    handedOff: number;
    won: number;
    avgScore: number;
  };
  events: Array<{
    id: string;
    agent: string;
    event_type: string;
    created_at: string;
  }>;
  config: {
    memoryMode: boolean;
    backend: string;
    postgres: boolean;
    supabase: boolean;
    resend: boolean;
    smtp: boolean;
    mail: boolean;
    llm: boolean;
    site: string;
  };
};

const EVENT_COPY: Record<string, string> = {
  lead_created: "Alta en cartera",
  draft_created: "Borrador de salida",
  email_sent: "Correspondencia enviada",
  email_simulated: "Envío simulado",
  email_rejected: "Envío rechazado",
  reply_drafted: "Respuesta preparada",
  handoff: "Entrega a dirección",
  prospect_batch: "Prospección",
  form_submission: "Consulta desde la web",
};

function eventLabel(type: string) {
  return EVENT_COPY[type] || type.replaceAll("_", " ");
}

function agentLabel(agent: string) {
  if (agent === "sales_agent") return "Comercial";
  if (agent === "marketing_agent") return "Prospección";
  if (agent === "system") return "Casa";
  return agent;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <p className="text-[var(--danger)]">{error}</p>;
  }

  if (!data) {
    return <p className="kicker">Preparando el escritorio</p>;
  }

  const figures = [
    { label: "Cartera", value: data.stats.totalLeads, note: `${data.stats.newLeads} nuevas` },
    { label: "Por firmar", value: data.stats.pendingApprovals, note: "correspondencia" },
    { label: "En tu mesa", value: data.stats.handedOff, note: "cierre y obra" },
    { label: "Cerrados", value: data.stats.won, note: `índice ${data.stats.avgScore}` },
  ];

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-14">
      <header className="flex flex-col gap-6 border-b border-[var(--line)] pb-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="kicker">{today}</p>
          <h1 className="display mt-4 text-5xl md:text-6xl">
            El estudio,
            <br />
            en orden.
          </h1>
          <p className="mt-5 max-w-md text-[var(--muted)]">
            La prospección abre puertas. Lo comercial califica. Tú cierras y
            construyes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/leads" className="btn btn-primary">
            Cartera
          </Link>
          <Link href="/approvals" className="btn btn-ghost">
            Firmar
          </Link>
        </div>
      </header>

      {data.config.memoryMode && (
        <p className="border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
          Sesión local. Los datos no persisten hasta conectar la base.
        </p>
      )}

      <section className="grid grid-cols-2 gap-0 border-t border-b border-[var(--line)] md:grid-cols-4">
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={`px-0 py-8 md:px-6 ${i !== 0 ? "md:border-l md:border-[var(--line)]" : ""} ${i % 2 === 1 ? "border-l border-[var(--line)] md:border-l" : ""}`}
          >
            <p className="kicker">{f.label}</p>
            <p className="display mt-3 text-5xl">{f.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{f.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="kicker">Libro del día</p>
          <h2 className="display mt-3 text-3xl">Movimientos</h2>
          {data.events.length === 0 ? (
            <p className="mt-6 text-[var(--muted)]">
              Aún no hay actividad. Abre una ficha o lanza una prospección.
            </p>
          ) : (
            <ol className="mt-8 divide-y divide-[var(--line)] border-t border-b border-[var(--line)]">
              {data.events.slice(0, 8).map((e) => (
                <li
                  key={e.id}
                  className="flex items-baseline justify-between gap-6 py-4 text-sm"
                >
                  <span>
                    <span className="text-[var(--muted)]">{agentLabel(e.agent)}</span>
                    <span className="mx-2 text-[var(--line)]">/</span>
                    {eventLabel(e.event_type)}
                  </span>
                  <time className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {new Date(e.created_at).toLocaleString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <p className="kicker">Casa</p>
          <h2 className="display mt-3 text-3xl">Sistemas</h2>
          <dl className="mt-8 space-y-5 text-sm">
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--muted)]">Archivo</dt>
              <dd>{data.config.backend}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--muted)]">Correo</dt>
              <dd>
                {data.config.resend
                  ? "Resend"
                  : data.config.smtp
                    ? "SMTP"
                    : "En espera"}
              </dd>
            </div>
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--muted)]">Redacción</dt>
              <dd>{data.config.llm ? "Asistida" : "Plantilla"}</dd>
            </div>
          </dl>
          <Link
            href="/campaigns"
            className="mt-8 inline-block border-b border-[var(--ink)] pb-0.5 text-sm"
          >
            Abrir prospección
          </Link>
        </div>
      </section>
    </div>
  );
}
