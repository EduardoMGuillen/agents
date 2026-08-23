"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Lead, LeadStatus } from "@/lib/types";
import { isVisibleOnPipeline } from "@/lib/pipeline-visibility";

const COLUMNS: Array<{
  id: string;
  title: string;
  statuses: LeadStatus[];
  dot: string;
  tint: string;
}> = [
  { id: "new", title: "Leads nuevos", statuses: ["new"], dot: "#00BAC4", tint: "rgba(0,186,196,0.55)" },
  {
    id: "contacted",
    title: "Contactados",
    statuses: ["contacted"],
    dot: "#7C8CB5",
    tint: "rgba(124,140,181,0.55)",
  },
  {
    id: "proposal",
    title: "Propuesta",
    statuses: ["replied", "qualified", "handed_off"],
    dot: "#017A85",
    tint: "rgba(1,122,133,0.55)",
  },
  { id: "closed", title: "Cerrado", statuses: ["won"], dot: "#102865", tint: "rgba(16,40,101,0.7)" },
];

const AVATAR = ["#00BAC4", "#102865", "#017A85", "#7C8CB5", "#16305F", "#9AA5B1"];

function initials(lead: Lead) {
  const s = (lead.company || lead.name || lead.email || "?").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.max(1, Math.round(ms / 36e5));
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  return `hace ${d} d`;
}

function columnOf(status: LeadStatus) {
  return COLUMNS.find((c) => c.statuses.includes(status))?.id ?? "new";
}

function primaryStatus(columnId: string): LeadStatus {
  if (columnId === "proposal") return "qualified";
  if (columnId === "closed") return "won";
  if (columnId === "contacted") return "contacted";
  return "new";
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/leads");
    const json = await res.json();
    setLeads(json.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const fresh = useMemo(
    () => leads.filter(isVisibleOnPipeline),
    [leads],
  );

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return fresh;
    return fresh.filter((l) =>
      `${l.company} ${l.name} ${l.email} ${l.niche} ${l.country}`
        .toLowerCase()
        .includes(t),
    );
  }, [fresh, q]);

  const pending = fresh.filter((l) => l.status === "new").length;
  const contacted = fresh.filter((l) => l.status === "contacted").length;
  const replied = fresh.filter((l) =>
    ["replied", "qualified", "handed_off"].includes(l.status),
  ).length;
  const won = fresh.filter((l) => l.status === "won").length;
  const hot = fresh.filter((l) => l.score >= 58 && l.status === "new").length;

  async function move(id: string, columnId: string) {
    const status = primaryStatus(columnId);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status, updated_at: new Date().toISOString() }
          : l,
      ),
    );
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl">Pipeline</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Nuevos y contactados se ocultan a las 2 semanas; propuesta y
            cerrados a los 2 meses. El lead sigue en Leads; si contestan,
            vuelven aquí.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-52 shrink-0">
            <input
              className="field"
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Link href="/leads" className="btn btn-primary">
            + Nuevo lead
          </Link>
        </div>
      </div>

      <div className="ai-banner">
        {hot} leads priorizados. {pending} siguen en Leads nuevos sin contactar.
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Leads nuevos" value={String(pending)} hint="sin contactar" color="#00BAC4" />
        <Stat label="En pipeline" value={String(contacted + replied)} hint="en movimiento" color="#7C8CB5" />
        <Stat label="Propuesta" value={String(replied)} hint="calificados / respondieron" color="#017A85" />
        <Stat label="Cerrados" value={String(won)} hint="ganados" color="#00BAC4" />
      </section>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando…</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const cards = visible
              .filter((l) => columnOf(l.status) === col.id)
              .sort((a, b) => b.score - a.score);
            return (
              <div
                key={col.id}
                className="flex min-w-[260px] flex-1 flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/lead-id") || dragId;
                  if (id) void move(id, col.id);
                  setDragId(null);
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: col.dot }}
                    />
                    {col.title}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{cards.length}</span>
                </div>
                <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
                  {cards.slice(0, 40).map((lead, i) => (
                    <article
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(lead.id);
                        e.dataTransfer.setData("text/lead-id", lead.id);
                      }}
                      className="cursor-grab rounded-xl border border-[var(--line)] bg-[var(--field)] p-3 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex gap-2">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                            style={{
                              background: AVATAR[i % AVATAR.length],
                              color:
                                AVATAR[i % AVATAR.length] === "#00BAC4" ||
                                AVATAR[i % AVATAR.length] === "#9AA5B1"
                                  ? "#062428"
                                  : "#ffffff",
                            }}
                          >
                            {initials(lead)}
                          </span>
                          <div>
                            <Link
                              href={`/leads/${lead.id}`}
                              className="block text-sm font-semibold hover:text-[var(--accent)]"
                            >
                              {lead.company || lead.name || "Sin nombre"}
                            </Link>
                            <p className="text-xs text-[var(--muted)]">
                              {lead.niche || lead.email}
                            </p>
                          </div>
                        </div>
                        {lead.score >= 62 && (
                          <span className="text-xs text-[#fbbf24]">★</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">
                          {lead.country} · {ago(lead.updated_at)}
                        </span>
                        <span className="badge badge-accent">{lead.score}</span>
                      </div>
                    </article>
                  ))}
                  {cards.length > 40 && (
                    <Link href="/leads" className="py-2 text-center text-xs text-[var(--accent)]">
                      +{cards.length - 40} más en Leads
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <div
      className="panel p-4"
      style={{ borderTop: `2px solid ${color}` }}
    >
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs" style={{ color }}>
        {hint}
      </p>
    </div>
  );
}
