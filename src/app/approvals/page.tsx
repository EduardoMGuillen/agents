"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Approval } from "@/lib/types";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "">("pending");
  const [blast, setBlast] = useState<string | null>(null);

  async function load(next = filter) {
    const qs = next ? `?status=${next}` : "";
    const res = await fetch(`/api/approvals${qs}`);
    const json = await res.json();
    setApprovals(json.approvals ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: string, quiet = false) {
    setBusyId(id);
    const res = await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) {
      if (!quiet) alert(json.error || "Error");
      return { ok: false as const, error: json.error || "Error", simulated: false };
    }
    if (json.result?.simulated && !quiet) {
      alert("Aprobado en modo simulado (sin mail configurado). El mensaje quedó registrado.");
    }
    if (!quiet) await load();
    return {
      ok: true as const,
      simulated: Boolean(json.result?.simulated),
    };
  }

  async function sendAll() {
    const pending = approvals.filter((a) => a.status === "pending");
    if (pending.length === 0) {
      alert("No hay pendientes.");
      return;
    }
    if (
      !confirm(
        `Vas a enviar ${pending.length} correos de verdad, uno tras otro. Gmail/Resend pueden cortar si mandas demasiados seguidos. ¿Seguimos?`,
      )
    ) {
      return;
    }
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < pending.length; i++) {
      setBlast(`Enviando ${i + 1} de ${pending.length}…`);
      const result = await approve(pending[i].id, true);
      if (result.ok) sent += 1;
      else failed += 1;
      await new Promise((r) => setTimeout(r, 450));
    }
    setBlast(null);
    await load();
    alert(`Listo. Enviados: ${sent}. Fallidos: ${failed}.`);
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

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="display text-2xl"
        >
          Approvals
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Revisa o manda el lote. Un clic en Enviar todos recorre los pendientes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
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
        {filter === "pending" && approvals.length > 0 && (
          <button
            className="btn btn-primary"
            disabled={!!busyId || !!blast}
            onClick={sendAll}
          >
            {blast || `Enviar todos (${approvals.length})`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {approvals.length === 0 ? (
          <div className="panel p-4 text-sm text-[var(--muted)]">
            No hay approvals. Genera un draft desde un lead.
          </div>
        ) : (
          approvals.map((a) => (
            <article key={a.id} className="panel p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.subject}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Para {a.to_email} · {a.agent} · {a.status}
                  </p>
                </div>
                <Link
                  href={`/leads/${a.lead_id}`}
                  className="text-xs text-[var(--accent)]"
                >
                  Ver lead
                </Link>
              </div>
              <pre className="mb-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--bg)] p-3 text-sm text-[var(--muted)]">
                {a.body}
              </pre>
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary"
                    disabled={busyId === a.id}
                    onClick={() => approve(a.id)}
                  >
                    {busyId === a.id ? "…" : "Aprobar y enviar"}
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busyId === a.id}
                    onClick={() => reject(a.id)}
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
