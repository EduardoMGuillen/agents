"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Campaign, Lead } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [created, setCreated] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    setCampaigns(json.campaigns ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated([]);
    const fd = new FormData(e.currentTarget);
    const payload = {
      niche: String(fd.get("niche")),
      city: String(fd.get("city")),
      country: String(fd.get("country") || "MX"),
      locale: String(fd.get("locale") || "es") as "es" | "en",
      count: Number(fd.get("count") || 5),
      campaignName: String(fd.get("campaignName") || "") || undefined,
    };

    const res = await fetch("/api/agents/marketing/prospect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ? JSON.stringify(json.error) : "Error");
      return;
    }
    setCreated(json.leads ?? []);
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1
            className="display text-4xl"
        >
          Marketing Agent
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Genera prospectos por nicho y ciudad. Luego Sales redacta el primer
          contacto (con tu aprobación).
        </p>
      </div>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-4 md:grid-cols-2">
        <div>
          <label className="label">Nicho</label>
          <input
            name="niche"
            className="field"
            required
            placeholder="restaurantes, clínicas dentales…"
          />
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input name="city" className="field" required placeholder="Monterrey" />
        </div>
        <div>
          <label className="label">País</label>
          <input name="country" className="field" defaultValue="MX" />
        </div>
        <div>
          <label className="label">Idioma outreach</label>
          <select name="locale" className="field" defaultValue="es">
            <option value="es">Español (local)</option>
            <option value="en">English (internacional)</option>
          </select>
        </div>
        <div>
          <label className="label">Cantidad (1–8)</label>
          <input name="count" type="number" min={1} max={8} defaultValue={5} className="field" />
        </div>
        <div>
          <label className="label">Nombre campaña (opcional)</label>
          <input name="campaignName" className="field" />
        </div>
        <div className="md:col-span-2">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Marketing Agent trabajando…" : "Generar prospectos"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {created.length > 0 && (
        <div className="panel p-4">
          <h2 className="mb-2 font-semibold">Leads creados ahora</h2>
          <ul className="space-y-2 text-sm">
            {created.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <Link href={`/leads/${l.id}`} className="text-[var(--accent)]">
                  {l.company}
                </Link>
                <span className="text-[var(--muted)]">
                  {l.email || "sin email — completar antes de enviar"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel p-4">
        <h2 className="mb-3 font-semibold">Campañas</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aún no hay campañas.</p>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {c.niche} · {c.city}, {c.country} · {c.locale}
                  </p>
                </div>
                <span className="badge">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
