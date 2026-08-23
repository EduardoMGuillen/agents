"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Campaign, Lead } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [created, setCreated] = useState<Lead[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    found?: number;
    withWebsite?: number;
    withEmail?: number;
  } | null>(null);

  async function load() {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    setCampaigns(json.campaigns ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function applyResult(
    json: {
      leads?: Lead[];
      skipped?: number;
      error?: unknown;
      found?: number;
      withWebsite?: number;
      withEmail?: number;
    },
    ok: boolean,
  ) {
    setStats({
      found: json.found,
      withWebsite: json.withWebsite,
      withEmail: json.withEmail,
    });
    if (!ok) {
      setError(
        typeof json.error === "string"
          ? json.error
          : JSON.stringify(json.error || "Error"),
      );
      return;
    }
    setCreated(json.leads ?? []);
    setSkipped(json.skipped ?? 0);
  }

  async function onPlaces(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("places");
    setError(null);
    setCreated([]);
    setStats(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/agents/marketing/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche: String(fd.get("niche")),
        city: String(fd.get("city")),
        country: String(fd.get("country") || "HN"),
        limit: Number(fd.get("limit") || 12),
      }),
    });
    const json = await res.json();
    setBusy(null);
    applyResult(json, res.ok);
    await load();
  }

  async function onScrapling(form: HTMLFormElement) {
    setBusy("scrapling");
    setError(null);
    setCreated([]);
    setStats(null);
    const fd = new FormData(form);
    const res = await fetch("/api/scrape-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche: String(fd.get("niche")),
        city: String(fd.get("city")),
        country: String(fd.get("country") || "HN"),
        limit: Number(fd.get("limit") || 12),
      }),
    });
    const json = await res.json();
    setBusy(null);
    applyResult(json, res.ok);
    await load();
  }

  async function onCsv(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("csv");
    setError(null);
    setCreated([]);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/leads/import", { method: "POST", body: fd });
    const json = await res.json();
    setBusy(null);
    applyResult(json, res.ok);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <h1 className="display text-2xl">Prospecting</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          Busca PYMEs en cualquier ciudad del mundo. Descarta cadenas. El mail
          va en español si el país es hispanohablante; si no, en inglés.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-2">
        <form onSubmit={onPlaces} className="panel space-y-4 p-5">
          <h2 className="display text-xl">Buscar negocios</h2>
          <p className="text-sm text-[var(--muted)]">
            Google Maps encuentra PYMEs (sin cadenas). El botón Scrapling corre
            en Vercel: busca y saca emails públicos de las webs.
          </p>
          <div>
            <label className="label">Nicho</label>
            <input name="niche" className="field" required placeholder="restaurante, clínica…" />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input name="city" className="field" required placeholder="Miami, Bogotá, Osaka…" />
          </div>
          <div>
            <label className="label">País</label>
            <input name="country" className="field" defaultValue="HN" placeholder="HN, MX, US, ES, JP…" />
          </div>
          <div>
            <label className="label">Máximo</label>
            <input name="limit" type="number" min={5} max={20} defaultValue={12} className="field" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={!!busy}>
              {busy === "places" ? "Buscando y sacando emails…" : "Buscar ahora (Maps)"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!!busy}
              onClick={(ev) => {
                const form = (ev.currentTarget as HTMLButtonElement).form;
                if (form) onScrapling(form);
              }}
            >
              {busy === "scrapling" ? "Buscando emails…" : "Buscar con Scrapling"}
            </button>
          </div>
        </form>

        <form onSubmit={onCsv} className="panel space-y-4 p-5">
          <h2 className="display text-xl">Importar CSV</h2>
          <p className="text-sm text-[var(--muted)]">
            CSV con columnas de empresa, email, país…
          </p>
          <div>
            <label className="label">Archivo .csv</label>
            <input name="file" type="file" accept=".csv,text/csv" className="field" />
          </div>
          <div>
            <label className="label">O URL del CSV</label>
            <input name="url" className="field" placeholder="https://…" />
          </div>
          <div>
            <label className="label">Nombre de la tanda</label>
            <input name="campaignName" className="field" />
          </div>
          <button className="btn btn-primary" disabled={!!busy}>
            {busy === "csv" ? "Importando…" : "Importar"}
          </button>
        </form>
      </section>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {stats && (
        <p className="text-sm text-[var(--muted)]">
          Maps: {stats.found ?? 0} negocios · {stats.withWebsite ?? 0} con web ·{" "}
          {stats.withEmail ?? 0} con email
        </p>
      )}

      {created.length > 0 && (
        <div>
          <p className="text-sm text-[var(--muted)]">
            {created.length} altas
            {skipped ? ` · ${skipped} duplicados omitidos` : ""}
          </p>
          <ul className="mt-4 divide-y divide-[var(--line)] border-t border-b border-[var(--line)]">
            {created.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <Link href={`/leads/${l.id}`}>{l.company}</Link>
                <span className="text-[var(--muted)]">
                  {l.website ? "con web" : "sin web"} · {l.email || "sin email"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium">Tandas</h2>
        {campaigns.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Todavía no hay tandas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span>
                  {c.name}
                  <span className="ml-2 text-[var(--muted)]">
                    {c.niche} · {c.city}
                    {c.status !== "active" ? ` · ${c.status}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
