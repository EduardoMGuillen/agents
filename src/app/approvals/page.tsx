"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Approval } from "@/lib/types";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "">("pending");

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

  async function approve(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) {
      alert(json.error || "Error");
      return;
    }
    if (json.result?.simulated) {
      alert("Aprobado en modo simulado (sin RESEND_API_KEY). El mensaje quedó registrado.");
    }
    await load();
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
          className="display text-4xl"
        >
          Approvals
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Nada sale por Resend sin tu OK (fase segura).
        </p>
      </div>

      <div className="flex gap-2">
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
