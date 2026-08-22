"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

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
    googlePlaces?: boolean;
    site: string;
  };
};

const EVENT_COPY: Record<string, string> = {
  lead_created: "Lead created",
  draft_created: "Draft ready",
  email_sent: "Email sent",
  email_simulated: "Email simulated",
  email_rejected: "Email rejected",
  reply_drafted: "Reply drafted",
  handoff: "Handed off to you",
  prospect_batch: "Prospect batch",
  form_submission: "Website form",
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

  if (error) return <p className="text-[var(--danger)]">{error}</p>;
  if (!data) return <p className="text-[var(--muted)]">Loading…</p>;

  const cards = [
    { label: "Leads", value: data.stats.totalLeads, hint: `${data.stats.newLeads} new` },
    { label: "Approvals", value: data.stats.pendingApprovals, hint: "waiting on you" },
    { label: "Handoff", value: data.stats.handedOff, hint: "ready to close" },
    { label: "Won", value: data.stats.won, hint: `avg score ${data.stats.avgScore}` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Prospecting finds companies. Sales qualifies. You build the website.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/campaigns" className="btn btn-ghost">
            Find leads
          </Link>
          <Link href="/approvals" className="btn btn-primary">
            Review emails
          </Link>
        </div>
      </div>

      {data.config.memoryMode && (
        <p className="panel px-4 py-3 text-sm text-[var(--muted)]">
          Local memory mode — data won’t persist until the database is connected.
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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-medium">Activity</h2>
          {data.events.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No events yet. Import a CSV or search a city.
            </p>
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

        <div className="panel p-5">
          <h2 className="text-sm font-medium">Systems</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Database</span>
              <span>{data.config.backend}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Email</span>
              <span>
                {data.config.resend ? "Resend" : data.config.smtp ? "SMTP" : "Off"}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">LLM</span>
              <span>{data.config.llm ? "OpenAI" : "Templates"}</span>
            </li>
          </ul>
          <Link href="/leads" className="btn btn-ghost mt-5">
            Open leads
          </Link>
        </div>
      </section>
    </div>
  );
}
