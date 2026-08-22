"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Approval } from "@/lib/types";

const GAP_MS = 4000;

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "">("pending");
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
      return { ok: false as const, error: json.error || "Error" };
    }
    if (json.result?.simulated && !quiet) {
      alert("No se envió: falta RESEND_API_KEY.");
    }
    if (!quiet) await load();
    return { ok: true as const };
  }

  async function waitGap(
    ms: number,
    patch: (sec: number) => void,
  ) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const left = Math.ceil((ms - (Date.now() - start)) / 1000);
      patch(left);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  async function sendAll() {
    const pending = approvals.filter((a) => a.status === "pending");
    if (pending.length === 0) {
      alert("No hay pendientes.");
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

  const pct = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl">Approvals</h1>
        <p className="text-sm text-[var(--muted)]">
          El envío sale solo por Resend. En lote hay 4 segundos entre cada mail.
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
            disabled={!!busyId || !!progress}
            onClick={sendAll}
          >
            {progress
              ? `Enviando… ${pct}%`
              : `Enviar todos (${approvals.length})`}
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
                    disabled={busyId === a.id || !!progress}
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
            </article>
          ))
        )}
      </div>
    </div>
  );
}
