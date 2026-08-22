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

  async function load() {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    setCampaigns(json.campaigns ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function applyResult(json: {
    leads?: Lead[];
    skipped?: number;
    error?: unknown;
  }, ok: boolean) {
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
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/agents/marketing/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche: String(fd.get("niche")),
        city: String(fd.get("city")),
        country: String(fd.get("country") || "HN"),
        locale: String(fd.get("locale") || "es"),
        limit: Number(fd.get("limit") || 25),
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

  async function onInvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("invent");
    setError(null);
    setCreated([]);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/agents/marketing/prospect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche: String(fd.get("niche")),
        city: String(fd.get("city")),
        country: String(fd.get("country") || "HN"),
        locale: String(fd.get("locale") || "es"),
        count: Number(fd.get("count") || 5),
      }),
    });
    const json = await res.json();
    setBusy(null);
    applyResult(json, res.ok);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-14">
      <header className="border-b border-[var(--line)] pb-8">
        <p className="text-sm text-[var(--muted)]">Prospecting</p>
        <h1 className="display text-2xl">Prospecting</h1>
        <p className="mt-4 max-w-xl text-[var(--muted)]">
          Tres vías: directorio público de la ciudad, un CSV de empresas, o una
          lista ilustrativa. Luego, en Cartera, se redacta la oferta de web.
        </p>
      </header>

      <section className="grid gap-12 lg:grid-cols-2">
        <form onSubmit={onPlaces} className="space-y-5">
          <p className="kicker">Directorio</p>
          <h2 className="display text-xl">Buscar en la ciudad</h2>
          <p className="text-sm text-[var(--muted)]">
            OpenStreetMap: restaurantes, clínicas, talleres, hoteles… Prioriza
            quienes no tienen web. El email hay que completarlo si no viene.
          </p>
          <div>
            <label className="label">Oficio / nicho</label>
            <input name="niche" className="field" required placeholder="restaurante, clínica, dental…" />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input name="city" className="field" required placeholder="Tegucigalpa" />
          </div>
          <div>
            <label className="label">País</label>
            <input name="country" className="field" defaultValue="HN" />
          </div>
          <div>
            <label className="label">Idioma de la oferta</label>
            <select name="locale" className="field" defaultValue="es">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="label">Máximo</label>
            <input name="limit" type="number" min={5} max={40} defaultValue={20} className="field" />
          </div>
          <button className="btn btn-primary" disabled={!!busy}>
            {busy === "places" ? "Buscando…" : "Buscar negocios"}
          </button>
        </form>

        <form onSubmit={onCsv} className="space-y-5">
          <p className="kicker">Archivo</p>
          <h2 className="display text-xl">CSV de empresas</h2>
          <p className="text-sm text-[var(--muted)]">
            Columnas: company o empresa, email, phone, website, city, niche.
            También puedes pegar la URL de un CSV público.
          </p>
          <div>
            <label className="label">Archivo .csv</label>
            <input name="file" type="file" accept=".csv,text/csv" className="field" />
          </div>
          <div>
            <label className="label">O URL del CSV</label>
            <input name="url" className="field" placeholder="https://…/empresas.csv" />
          </div>
          <div>
            <label className="label">Nombre de la tanda</label>
            <input name="campaignName" className="field" placeholder="SPS restaurantes agosto" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn btn-primary" disabled={!!busy}>
              {busy === "csv" ? "Importando…" : "Importar CSV"}
            </button>
            <a href="/muestra-leads.csv" className="text-sm border-b border-[var(--ink)] pb-0.5">
              Descargar muestra
            </a>
          </div>
        </form>
      </section>

      <form onSubmit={onInvent} className="border-t border-[var(--line)] pt-12 space-y-5 max-w-xl">
        <p className="kicker">Lista ilustrativa</p>
        <h2 className="display text-xl">Nombres de prueba</h2>
        <p className="text-sm text-[var(--muted)]">
          No son empresas reales. Úsalo solo para ensayar el tono de la oferta.
        </p>
        <div>
          <label className="label">Nicho</label>
          <input name="niche" className="field" required defaultValue="restaurante" />
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input name="city" className="field" required defaultValue="Tegucigalpa" />
        </div>
        <input type="hidden" name="country" value="HN" />
        <input type="hidden" name="count" value="5" />
        <button className="btn btn-ghost" disabled={!!busy}>
          {busy === "invent" ? "…" : "Generar 5 de ensayo"}
        </button>
      </form>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {created.length > 0 && (
        <div className="border-t border-[var(--line)] pt-10">
          <p className="kicker">Resultado</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {created.length} altas
            {skipped ? ` · ${skipped} ya estaban en cartera` : ""}
          </p>
          <ul className="mt-6 divide-y divide-[var(--line)] border-t border-b border-[var(--line)]">
            {created.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <Link href={`/leads/${l.id}`} className="border-b border-transparent hover:border-[var(--ink)]">
                  {l.company}
                </Link>
                <span className="text-[var(--muted)]">
                  {l.website ? "con web" : "sin web"} · {l.email || "sin email"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-[var(--line)] pt-10">
        <p className="kicker">Tandas</p>
        {campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Todavía no hay tandas.</p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span>
                  {c.name}
                  <span className="ml-2 text-[var(--muted)]">
                    {c.niche} · {c.city}
                  </span>
                </span>
                <span className="kicker">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
