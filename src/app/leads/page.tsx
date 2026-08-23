"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/types";
import { ScorePill, StatusBadge } from "@/components/status-badge";
import { countryName } from "@/lib/locale";

type ReplyFilter = "" | "not_sent" | "waiting" | "replied";

function replyState(lead: Lead): Exclude<ReplyFilter, ""> {
  if (
    lead.status === "replied" ||
    lead.status === "qualified" ||
    lead.status === "handed_off" ||
    lead.status === "won"
  ) {
    return "replied";
  }
  if (lead.status === "contacted") return "waiting";
  return "not_sent";
}

const REPLY_LABEL: Record<Exclude<ReplyFilter, "">, string> = {
  not_sent: "Sin enviar",
  waiting: "Sin respuesta",
  replied: "Contestó",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>("");
  const [nameQuery, setNameQuery] = useState("");
  const [country, setCountry] = useState("");
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
      email: String(fd.get("email") || ""),
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

  const countries = useMemo(() => {
    const set = new Set(
      leads.map((l) => (l.country || "").trim().toUpperCase()).filter(Boolean),
    );
    return [...set].sort((a, b) =>
      countryName(a).localeCompare(countryName(b), "es"),
    );
  }, [leads]);

  const visible = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return leads.filter((l) => {
      if (replyFilter && replyState(l) !== replyFilter) return false;
      if (country && (l.country || "").toUpperCase() !== country) return false;
      if (q) {
        const hay = `${l.name || ""} ${l.company || ""} ${l.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, replyFilter, nameQuery, country]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="display text-2xl"
          >
            Leads
          </h1>
          <p className="text-sm text-[var(--muted)]">
          Pipeline: quién contestó, quién sigue en silencio y a quién aún no
          les escribes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            disabled={saving}
            onClick={async () => {
              if (!confirm("¿Generar un mail de oferta para cada empresa (sin enviar)?")) {
                return;
              }
              setSaving(true);
              const res = await fetch("/api/leads/draft-all", { method: "POST" });
              const json = await res.json();
              setSaving(false);
              alert(
                res.ok
                  ? `${json.created} borradores listos en Approvals (${json.skipped} omitidos).`
                  : json.error || "Error",
              );
            }}
          >
            {saving ? "Generando…" : "Generar mails"}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cerrar" : "Nuevo lead"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="label">Nombre</label>
          <input
            className="field"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Empresa, contacto o email"
          />
        </div>
        <div className="w-[220px]">
          <label className="label">País</label>
          <select
            className="field"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Todos</option>
            {countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code) || code} ({code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["", "Todos"],
            ["not_sent", "Sin enviar"],
            ["waiting", "Sin respuesta"],
            ["replied", "Contestaron"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key || "all-reply"}
            className={`btn ${replyFilter === key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setReplyFilter(key)}
          >
            {label}
          </button>
        ))}
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
            {STATUS_LABELS[s]}
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
            <input name="email" type="email" className="field" required />
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
        ) : visible.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">
            {leads.length === 0
              ? "No hay leads. Crea uno manual o genera prospectos en Prospecting."
              : "Ningún lead coincide con nombre o país."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa / Lead</th>
                  <th className="px-4 py-3 font-medium">Respuesta</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Fuente</th>
                  <th className="px-4 py-3 font-medium">Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((lead) => (
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
                      <span className="badge">{REPLY_LABEL[replyState(lead)]}</span>
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
