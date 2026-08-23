"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Approval, Lead } from "@/lib/types";
import { renderEmailHtml } from "@/lib/email-template";

const GAP_MS = 1500;

const STATUS_LABEL: Record<Approval["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  sent: "Enviado",
};

function leadLabel(lead: Lead | undefined, approval: Approval) {
  if (!lead) return approval.to_email;
  return lead.company || lead.name || approval.to_email;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [leadsById, setLeadsById] = useState<Record<string, Lead>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "">("pending");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    sent: number;
    failed: number;
    waitSec: number;
    to: string;
  } | null>(null);

  async function load(next = filter) {
    const qs = next ? `?status=${next}` : "";
    const [approvalsRes, leadsRes] = await Promise.all([
      fetch(`/api/approvals${qs}`),
      fetch("/api/leads"),
    ]);
    const approvalsJson = await approvalsRes.json();
    const leadsJson = await leadsRes.json();
    setApprovals(approvalsJson.approvals ?? []);
    const map: Record<string, Lead> = {};
    for (const lead of (leadsJson.leads ?? []) as Lead[]) {
      map[lead.id] = lead;
    }
    setLeadsById(map);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return approvals;
    return approvals.filter((a) => {
      const lead = leadsById[a.lead_id];
      const hay = [
        a.subject,
        a.to_email,
        a.body,
        a.agent,
        a.status,
        lead?.company,
        lead?.name,
        lead?.email,
        lead?.city,
        lead?.niche,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [approvals, leadsById, query]);

  async function approve(id: string, quiet = false) {
    setBusyId(id);
    const res = await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) {
      if (!quiet) alert(json.error || "Error");
      return { ok: false as const, error: json.error || "Error" };
    }
    if (json.result?.simulated && !quiet) {
      alert("No se envió: falta RESEND_API_KEY.");
    }
    if (!quiet) await load();
    return { ok: true as const };
  }

  async function waitGap(ms: number, patch: (sec: number) => void) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const left = Math.ceil((ms - (Date.now() - start)) / 1000);
      patch(left);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  async function sendAll() {
    const pending = visible.filter((a) => a.status === "pending");
    if (pending.length === 0) {
      alert("No hay pendientes en esta lista.");
      return;
    }
    if (
      !confirm(
        `Se enviarán ${pending.length} correos por Resend, con ${GAP_MS / 1000}s entre cada uno. ¿Seguimos?`,
      )
    ) {
      return;
    }
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setProgress({
        current: i + 1,
        total: pending.length,
        sent,
        failed,
        waitSec: 0,
        to: item.to_email,
      });
      const result = await approve(item.id, true);
      if (result.ok) sent += 1;
      else failed += 1;
      setProgress({
        current: i + 1,
        total: pending.length,
        sent,
        failed,
        waitSec: 0,
        to: item.to_email,
      });
      if (i < pending.length - 1) {
        await waitGap(GAP_MS, (waitSec) =>
          setProgress({
            current: i + 1,
            total: pending.length,
            sent,
            failed,
            waitSec,
            to: item.to_email,
          }),
        );
      }
    }
    setProgress(null);
    await load();
    alert(`Listo por Resend. Enviados: ${sent}. Fallidos: ${failed}.`);
  }

  async function reject(id: string) {
    setBusyId(id);
    await fetch(`/api/approvals/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Rechazado desde panel" }),
    });
    setBusyId(null);
    await load();
  }

  function startEdit(a: Approval) {
    setOpenId(a.id);
    setEditingId(a.id);
    setDraftSubject(a.subject);
    setDraftBody(a.body);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: draftSubject.trim(),
        body: draftBody.trim(),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      alert(json.error || "No se pudo guardar");
      return;
    }
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...json.approval } : a)),
    );
    setEditingId(null);
  }

  const pct = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;
  const pendingCount = visible.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl">Mensajes</h1>
        <p className="text-sm text-[var(--muted)]">
          Borradores colapsados. Ábrelos para revisar, editar o enviar.
        </p>
      </div>

      {progress && (
        <div className="panel space-y-3 p-4">
          <div className="flex justify-between text-sm">
            <span>
              {progress.current} / {progress.total} · {progress.to}
            </span>
            <span className="text-[var(--muted)]">
              {progress.sent} ok · {progress.failed} error
              {progress.waitSec > 0 ? ` · siguiente en ${progress.waitSec}s` : ""}
            </span>
          </div>
          <div className="h-3 overflow-hidden border border-[var(--line)] bg-[var(--bg)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1">
          <input
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por negocio, asunto, email…"
          />
        </div>
        <button
          className={`btn ${filter === "pending" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            setFilter("pending");
            load("pending");
          }}
        >
          Pendientes
        </button>
        <button
          className={`btn ${filter === "" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            setFilter("");
            load("");
          }}
        >
          Todos
        </button>
        {filter === "pending" && pendingCount > 0 && (
          <button
            className="btn btn-primary"
            disabled={!!busyId || !!progress}
            onClick={sendAll}
          >
            {progress
              ? `Enviando… ${pct}%`
              : `Enviar lista (${pendingCount})`}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="panel p-4 text-sm text-[var(--muted)]">
            {approvals.length === 0
              ? "No hay mensajes. Genera un borrador desde un lead."
              : "Ningún mensaje coincide con el filtro."}
          </div>
        ) : (
          visible.map((a) => {
            const lead = leadsById[a.lead_id];
            const open = openId === a.id;
            const editing = editingId === a.id;
            const previewBody = editing ? draftBody : a.body;
            const previewSubject = editing ? draftSubject : a.subject;
            const company = leadLabel(lead, a);
            return (
              <article key={a.id} className="panel overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => {
                    setOpenId(open ? null : a.id);
                    if (open && editingId === a.id) setEditingId(null);
                  }}
                >
                  <span className="w-4 shrink-0 text-[var(--muted)]">
                    {open ? "▾" : "▸"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{company}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {previewSubject}
                    </p>
                  </div>
                  <span className="hidden truncate text-xs text-[var(--muted)] sm:block">
                    {a.to_email}
                  </span>
                  <span className="badge shrink-0">
                    {STATUS_LABEL[a.status]}
                  </span>
                </button>

                {open && (
                  <div className="space-y-3 border-t border-[var(--line)] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                      <span>
                        {a.agent} · {a.to_email}
                      </span>
                      <Link
                        href={`/leads/${a.lead_id}`}
                        className="text-[var(--accent)]"
                      >
                        Ver lead
                      </Link>
                    </div>

                    {editing ? (
                      <div className="space-y-2">
                        <label className="label">Asunto</label>
                        <input
                          className="field"
                          value={draftSubject}
                          onChange={(e) => setDraftSubject(e.target.value)}
                        />
                        <label className="label">Cuerpo</label>
                        <textarea
                          className="field min-h-48 font-mono text-sm"
                          value={draftBody}
                          onChange={(e) => setDraftBody(e.target.value)}
                        />
                      </div>
                    ) : null}

                    <iframe
                      title={previewSubject}
                      className="h-[380px] w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-black"
                      srcDoc={renderEmailHtml(previewBody, {
                        previewLogo: "/nexus-logo.png",
                      })}
                    />

                    {a.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        {editing ? (
                          <>
                            <button
                              className="btn btn-primary"
                              disabled={saving || !!progress}
                              onClick={() => saveEdit(a.id)}
                            >
                              {saving ? "Guardando…" : "Guardar"}
                            </button>
                            <button
                              className="btn btn-ghost"
                              disabled={saving}
                              onClick={() => setEditingId(null)}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            disabled={!!progress}
                            onClick={() => startEdit(a)}
                          >
                            Editar
                          </button>
                        )}
                        <button
                          className="btn btn-primary"
                          disabled={
                            busyId === a.id || !!progress || editing
                          }
                          onClick={() => approve(a.id)}
                        >
                          {busyId === a.id ? "…" : "Aprobar y enviar"}
                        </button>
                        <button
                          className="btn btn-danger"
                          disabled={busyId === a.id || !!progress}
                          onClick={() => reject(a.id)}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
