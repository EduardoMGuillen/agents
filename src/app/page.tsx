"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Mail, Users, Handshake } from "lucide-react";

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
    return <p className="text-[var(--muted)]">Cargando office…</p>;
  }

  const cards = [
    {
      label: "Leads",
      value: data.stats.totalLeads,
      hint: `${data.stats.newLeads} nuevos`,
      icon: Users,
    },
    {
      label: "Approvals",
      value: data.stats.pendingApprovals,
      hint: "pendientes de tu OK",
      icon: Mail,
    },
    {
      label: "Para ti",
      value: data.stats.handedOff,
      hint: "listos para cerrar/build",
      icon: Handshake,
    },
    {
      label: "Ganados",
      value: data.stats.won,
      hint: `score avg ${data.stats.avgScore}`,
      icon: Bot,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-[var(--accent)]">Nexus Global</p>
        <h1
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ fontFamily: "var(--font-syne), sans-serif" }}
        >
          Office de ventas
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Marketing encuentra leads. Sales habla y califica. Tú cierras y
          construyes el website.
        </p>
      </header>

      {data.config.memoryMode && (
        <div className="panel border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[#fcd34d]">
          Modo local (memoria). Conecta DATABASE_URL en Setup para persistir.
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="panel p-4">
              <div className="mb-3 flex items-center justify-between text-[var(--muted)]">
                <span className="text-sm">{c.label}</span>
                <Icon size={16} />
              </div>
              <p className="text-3xl font-semibold">{c.value}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{c.hint}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold">Estado del stack</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>Database</span>
              <span className={data.config.postgres || data.config.supabase ? "badge badge-ok" : "badge badge-warn"}>
                {data.config.backend}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Email (Resend/SMTP)</span>
              <span className={data.config.mail ? "badge badge-ok" : "badge badge-warn"}>
                {data.config.resend ? "Resend" : data.config.smtp ? "SMTP" : "Simulado"}
              </span>
            </li>
            <li className="flex justify-between">
              <span>OpenAI (agentes)</span>
              <span className={data.config.llm ? "badge badge-ok" : "badge badge-warn"}>
                {data.config.llm ? "OK" : "Fallback local"}
              </span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/leads" className="btn btn-primary">
              Ver leads
            </Link>
            <Link href="/campaigns" className="btn btn-ghost">
              Generar prospectos
            </Link>
            <Link href="/approvals" className="btn btn-ghost">
              Revisar emails
            </Link>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold">Actividad agentes</h2>
          {data.events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Sin eventos aún. Crea un lead o lanza una campaña de marketing.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.events.slice(0, 8).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <span>
                    <strong className="text-[var(--accent)]">{e.agent}</strong>{" "}
                    · {e.event_type}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
