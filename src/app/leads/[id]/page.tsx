"use client";

import { FormEvent, useEffect, useState, use } from "react";
import Link from "next/link";
import type { Lead, Message } from "@/lib/types";
import { ScorePill, StatusBadge } from "@/components/status-badge";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [inbound, setInbound] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/leads/${id}`);
    const json = await res.json();
    setLead(json.lead);
    setMessages(json.messages ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function draftFirst() {
    setBusy("draft");
    const res = await fetch(`/api/leads/${id}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "first_touch" }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setToast(json.error || "Error");
      return;
    }
    setToast("Borrador listo → ve a Approvals para aprobar el envío");
    await load();
  }

  async function draftReply(e: FormEvent) {
    e.preventDefault();
    setBusy("reply");
    const res = await fetch(`/api/leads/${id}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "reply", inbound }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setToast(json.error || "Error");
      return;
    }
    setInbound("");
    setToast("Respuesta borrador creada → Approvals");
    await load();
  }

  async function handoff() {
    setBusy("handoff");
    const res = await fetch(`/api/leads/${id}/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setBusy(null);
    if (!res.ok) {
      const json = await res.json();
      setToast(json.error || "Error");
      return;
    }
    setToast("Lead entregado a ti (Dev/Closer)");
    await load();
  }

  async function setStatus(status: Lead["status"]) {
    setBusy("status");
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    await load();
  }

  if (!lead) {
    return <p className="text-[var(--muted)]">Cargando lead…</p>;
  }

  return (
    <div className="space-y-5">
      <Link href="/leads" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        ← Leads
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            {lead.company || lead.name || "Lead"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {lead.email || "sin email"} · {lead.phone || "sin tel"} ·{" "}
            {lead.city || "—"}, {lead.country}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={lead.status} />
            <ScorePill score={lead.score} />
            <span className="badge">{lead.source}</span>
            <span className="badge">{lead.locale.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            disabled={!!busy || !lead.email}
            onClick={draftFirst}
          >
            {busy === "draft" ? "Generando…" : "Sales: primer email"}
          </button>
          <button
            className="btn btn-ghost"
            disabled={!!busy}
            onClick={() => setStatus("won")}
          >
            Marcar ganado
          </button>
          <button
            className="btn btn-danger"
            disabled={!!busy}
            onClick={() => setStatus("lost")}
          >
            Perdido
          </button>
        </div>
      </header>

      {toast && (
        <div className="panel px-4 py-3 text-sm text-[var(--accent)]">{toast}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel space-y-3 p-4">
          <h2 className="font-semibold">Perfil</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Web</dt>
              <dd>{lead.website || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Nicho</dt>
              <dd>{lead.niche || "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[var(--muted)]">Notas</dt>
              <dd className="whitespace-pre-wrap">{lead.notes || "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[var(--muted)]">Qualificación</dt>
              <dd className="whitespace-pre-wrap">
                {lead.qualification?.summary || JSON.stringify(lead.qualification)}
              </dd>
            </div>
          </dl>

          <div className="border-t border-[var(--line)] pt-3">
            <label className="label">Nota de handoff a ti</label>
            <textarea
              className="field min-h-20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Presupuesto, alcance, deadline…"
            />
            <button
              className="btn btn-primary mt-2"
              disabled={!!busy}
              onClick={handoff}
            >
              {busy === "handoff" ? "…" : "Entregar a Eduardo (Dev)"}
            </button>
          </div>
        </section>

        <section className="panel space-y-3 p-4">
          <h2 className="font-semibold">Conversación</h2>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Sin mensajes aún.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm"
                >
                  <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                    <span>
                      {m.direction} · {m.channel}
                      {m.agent ? ` · ${m.agent}` : ""}
                    </span>
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  {m.subject && <p className="font-medium">{m.subject}</p>}
                  <p className="whitespace-pre-wrap text-[var(--muted)]">{m.body}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={draftReply} className="space-y-2 border-t border-[var(--line)] pt-3">
            <label className="label">Pegar respuesta del lead → Sales redacta</label>
            <textarea
              className="field min-h-24"
              value={inbound}
              onChange={(e) => setInbound(e.target.value)}
              required
              placeholder="Hola, me interesa una cotización para…"
            />
            <button className="btn btn-ghost" disabled={!!busy || !lead.email}>
              {busy === "reply" ? "Redactando…" : "Generar reply (approval)"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
