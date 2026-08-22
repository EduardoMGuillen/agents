"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import { ScorePill, StatusBadge } from "@/components/status-badge";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load(nextStatus = status) {
    setLoading(true);
    const qs = nextStatus ? `?status=${nextStatus}` : "";
    const res = await fetch(`/api/leads${qs}`);
    const json = await res.json();
    setLeads(json.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || "") || null,
      email: String(fd.get("email") || "") || null,
      phone: String(fd.get("phone") || "") || null,
      company: String(fd.get("company") || "") || null,
      website: String(fd.get("website") || "") || null,
      city: String(fd.get("city") || "") || null,
      country: String(fd.get("country") || "MX"),
      locale: (String(fd.get("locale") || "es") as "es" | "en"),
      niche: String(fd.get("niche") || "") || null,
      notes: String(fd.get("notes") || "") || null,
      source: "manual" as const,
    };
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setShowForm(false);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="display text-4xl"
          >
            Leads
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Pipeline CRM — Sales Agent califica, tú cierras.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cerrar" : "Nuevo lead"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`btn ${status === "" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            setStatus("");
            load("");
          }}
        >
          Todos
        </button>
        {LEAD_STATUSES.map((s) => (
          <button
            key={s}
            className={`btn ${status === s ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setStatus(s);
              load(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="panel grid gap-3 p-4 md:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input name="name" className="field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="field" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input name="company" className="field" required />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input name="phone" className="field" />
          </div>
          <div>
            <label className="label">Web actual</label>
            <input name="website" className="field" placeholder="https://" />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input name="city" className="field" />
          </div>
          <div>
            <label className="label">País</label>
            <input name="country" className="field" defaultValue="MX" />
          </div>
          <div>
            <label className="label">Idioma</label>
            <select name="locale" className="field" defaultValue="es">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="label">Nicho</label>
            <input name="niche" className="field" placeholder="restaurante, clínica…" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notas</label>
            <textarea name="notes" className="field min-h-20" />
          </div>
          <div className="md:col-span-2">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Crear lead"}
            </button>
          </div>
        </form>
      )}

      <div className="panel overflow-hidden">
        {loading ? (
          <p className="p-4 text-[var(--muted)]">Cargando…</p>
        ) : leads.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">
            No hay leads. Crea uno manual o genera prospectos en Marketing.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa / Lead</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Fuente</th>
                  <th className="px-4 py-3 font-medium">Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-[var(--line)]/70 hover:bg-[var(--bg-soft)]/50"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:text-[var(--accent)]">
                        {lead.company || lead.name || lead.email || "Sin nombre"}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">
                        {lead.email || "sin email"} · {lead.locale.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ScorePill score={lead.score} />
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{lead.source}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {lead.city || "—"} / {lead.country}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
