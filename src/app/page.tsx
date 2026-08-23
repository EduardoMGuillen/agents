"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { STATUS_LABELS, type LeadStatus } from "@/lib/types";
import { ScorePill, StatusBadge } from "@/components/status-badge";

type HotLead = {
  id: string;
  company: string | null;
  email: string | null;
  niche: string | null;
  country: string;
  status: LeadStatus;
  score: number;
};

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
  pipeline: Record<string, number>;
  hotLeads: HotLead[];
  config: {
    memoryMode: boolean;
    backend: string;
    postgres: boolean;
    supabase: boolean;
    resend: boolean;
    smtp: boolean;
    mail: boolean;
    llm: boolean;
    googlePlaces?: boolean;
    site: string;
  };
};

const EVENT_COPY: Record<string, string> = {
  lead_created: "Lead creado",
  draft_created: "Borrador listo",
  email_sent: "Email enviado",
  email_simulated: "Email simulado",
  email_rejected: "Email rechazado",
  reply_drafted: "Reply redactado",
  handoff: "Entregado a ti",
  prospect_batch: "Tanda de prospectos",
  form_submission: "Formulario web",
};

const PIPE: LeadStatus[] = ["new", "contacted", "replied", "qualified", "won"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-[var(--danger)]">{error}</p>;
  if (!data) return <p className="text-[var(--muted)]">Cargando…</p>;

  const hot = data.hotLeads.filter((l) => l.score >= 58).length;
  const cards = [
    { label: "Leads activos", value: data.stats.totalLeads, hint: `${data.stats.newLeads} nuevos` },
    { label: "Por enviar", value: data.stats.pendingApprovals, hint: "en Approvals" },
    { label: "Respondieron", value: data.pipeline.replied ?? 0, hint: "hay que dar seguimiento" },
    { label: "Score IA medio", value: data.stats.avgScore, hint: `${hot} priorizados` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">CRM · agentes · outreach</p>
          <h1 className="display mt-1 text-3xl">Tu operación, en automático</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            La IA califica, redacta y prioriza. Tú cierras y construyes la web.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/campaigns" className="btn btn-ghost">
            Buscar leads
          </Link>
          <Link href="/approvals" className="btn btn-primary">
            Enviar correos
          </Link>
        </div>
      </div>

      <div className="ai-banner">
        <span className="text-[var(--accent)]">✦</span>
        <span>
          La IA priorizó {hot} leads y dejó {data.stats.pendingApprovals} mails
          listos para enviar.
        </span>
      </div>

      {data.config.memoryMode && (
        <p className="panel px-4 py-3 text-sm text-[var(--muted)]">
          Modo memoria local — conecta Postgres para persistir.
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            className="panel panel-hover p-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm text-[var(--muted)]">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{c.value}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{c.hint}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {PIPE.map((s) => (
          <div key={s} className="panel p-3">
            <p className="text-xs text-[var(--muted)]">{STATUS_LABELS[s]}</p>
            <p className="mt-1 text-2xl font-semibold">{data.pipeline[s] ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Leads calientes</h2>
            <Link href="/leads" className="text-xs text-[var(--accent)]">
              Ver todos
            </Link>
          </div>
          {data.hotLeads.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Todavía no hay leads.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.hotLeads.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/leads/${l.id}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {l.company || l.email}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {l.niche || "—"} · {l.country}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={l.status} />
                      <ScorePill score={l.score} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-medium">Actividad</h2>
          {data.events.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Sin eventos aún.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {data.events.slice(0, 8).map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-2.5 text-sm">
                  <span>
                    <span className="text-[var(--muted)]">{e.agent}</span>
                    {" · "}
                    {EVENT_COPY[e.event_type] || e.event_type}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">
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
