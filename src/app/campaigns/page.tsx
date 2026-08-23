"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Campaign, Lead } from "@/lib/types";
import type { CampaignMeta } from "@/lib/campaign-meta";
import { leadsToCsv } from "@/lib/csv";
import {
  ProspectingOverlay,
  type HuntInfo,
} from "@/components/prospecting-overlay";

type Batch = {
  campaign: Campaign;
  meta: CampaignMeta;
  leads: Lead[];
};

const KIND_LABEL: Record<string, string> = {
  osm: "OpenStreetMap",
  scrapling: "Scrapling",
  maps: "Maps",
  csv: "CSV",
  otros: "Otras",
};

function downloadLeadsCsv(name: string, leads: Lead[]) {
  const blob = new Blob([leadsToCsv(leads)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-zA-Z0-9áéíóúñüÁÉÍÓÚÑÜ]+/g, "_").slice(0, 60) || "leads"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CampaignsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [hunt, setHunt] = useState<HuntInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<number | null>(null);
  const [maxLimit, setMaxLimit] = useState(20);
  const [stats, setStats] = useState<{
    found?: number;
    withWebsite?: number;
    withEmail?: number;
  } | null>(null);

  async function load() {
    const res = await fetch("/api/prospecting");
    const json = await res.json();
    setBatches(json.batches ?? []);
    if (typeof json.maxLimit === "number") {
      setMaxLimit(json.maxLimit);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function applyResult(
    json: {
      leads?: Lead[];
      campaign?: Campaign | null;
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
    const leads = json.leads ?? [];
    setNewIds(new Set(leads.map((l) => l.id)));
    setSkipped(json.skipped ?? 0);
    if (json.campaign?.id) setOpenId(json.campaign.id);
  }

  async function onPlaces(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("places");
    setError(null);
    setNewIds(new Set());
    setStats(null);
    const fd = new FormData(e.currentTarget);
    const huntInfo: HuntInfo = {
      mode: "places",
      niche: String(fd.get("niche")),
      city: String(fd.get("city")),
      country: String(fd.get("country") || "HN"),
      limit: Number(fd.get("limit") || 12),
    };
    setHunt(huntInfo);
    try {
      const res = await fetch("/api/agents/marketing/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: huntInfo.niche,
          city: huntInfo.city,
          country: huntInfo.country,
          limit: huntInfo.limit,
        }),
      });
      const json = await res.json();
      applyResult(json, res.ok);
      await load();
    } finally {
      setBusy(null);
      setHunt(null);
    }
  }

  async function onScrapling(form: HTMLFormElement) {
    setBusy("scrapling");
    setError(null);
    setNewIds(new Set());
    setStats(null);
    const fd = new FormData(form);
    const huntInfo: HuntInfo = {
      mode: "scrapling",
      niche: String(fd.get("niche")),
      city: String(fd.get("city")),
      country: String(fd.get("country") || "HN"),
      limit: Number(fd.get("limit") || 12),
    };
    setHunt(huntInfo);
    try {
      const res = await fetch("/api/scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: huntInfo.niche,
          city: huntInfo.city,
          country: huntInfo.country,
          limit: huntInfo.limit,
        }),
      });
      const json = await res.json();
      applyResult(json, res.ok);
      await load();
    } finally {
      setBusy(null);
      setHunt(null);
    }
  }

  async function onCsv(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("csv");
    setError(null);
    setNewIds(new Set());
    setHunt({ mode: "csv" });
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/leads/import", { method: "POST", body: fd });
      const json = await res.json();
      applyResult(json, res.ok);
      await load();
    } finally {
      setBusy(null);
      setHunt(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <ProspectingOverlay hunt={hunt} />
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
            Google Maps encuentra PYMEs (sin cadenas). En local puedes pedir
            hasta {maxLimit} webs; en Vercel el tope es 20 por el timeout. Un
            lote grande puede tardar varios minutos.
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
            <input
              key={maxLimit}
              name="limit"
              type="number"
              min={5}
              max={maxLimit}
              defaultValue={Math.min(80, maxLimit)}
              className="field"
            />
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
              {busy === "scrapling"
                ? "Scrapeando webs… esto puede tardar"
                : "Buscar con Scrapling"}
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
            <label className="label">Nombre de la búsqueda</label>
            <input name="campaignName" className="field" />
          </div>
          <button className="btn btn-primary" disabled={!!busy}>
            {busy === "csv" ? "Importando…" : "Importar"}
          </button>
        </form>
      </section>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="display text-xl">Resultados</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cada búsqueda queda colapsada. Ábrela para ver los leads o bajar el CSV.
            </p>
          </div>
          {stats && (
            <p className="text-sm text-[var(--muted)]">
              {stats.found ?? 0} negocios · {stats.withWebsite ?? 0} con web ·{" "}
              {stats.withEmail ?? 0} con email
              {skipped ? ` · ${skipped} duplicados` : ""}
            </p>
          )}
        </div>

        {batches.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Aún no hay resultados. Busca un nicho o importa un CSV.
          </p>
        ) : (
          batches.map((batch) => {
            const open = openId === batch.campaign.id;
            const kind = batch.meta.kind
              ? KIND_LABEL[batch.meta.kind] || batch.meta.kind
              : "Búsqueda";
            return (
              <article key={batch.campaign.id} className="panel overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() =>
                      setOpenId(open ? null : batch.campaign.id)
                    }
                  >
                    <span className="w-4 shrink-0 text-[var(--muted)]">
                      {open ? "▾" : "▸"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {batch.campaign.name}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {kind}
                        {batch.campaign.city ? ` · ${batch.campaign.city}` : ""}
                        {` · ${batch.leads.length} leads`}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={batch.leads.length === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadLeadsCsv(batch.campaign.name, batch.leads);
                    }}
                  >
                    Descargar CSV
                  </button>
                </div>

                {open && (
                  <div className="border-t border-[var(--line)]">
                    {batch.leads.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-[var(--muted)]">
                        Esta búsqueda no dejó leads con email.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                          <thead className="text-xs text-[var(--muted)]">
                            <tr>
                              <th className="px-4 py-3 font-medium">Negocio</th>
                              <th className="px-4 py-3 font-medium">Email</th>
                              <th className="px-4 py-3 font-medium">Web</th>
                              <th className="px-4 py-3 font-medium">Ciudad</th>
                              <th className="px-4 py-3 font-medium">Nicho</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            {batch.leads.map((l) => (
                              <tr key={l.id}>
                                <td className="px-4 py-3">
                                  <Link
                                    href={`/leads/${l.id}`}
                                    className="font-medium"
                                  >
                                    {l.company || l.name || "Sin nombre"}
                                  </Link>
                                  {newIds.has(l.id) ? (
                                    <span className="badge badge-accent ml-2">
                                      Nuevo
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 text-[var(--muted)]">
                                  {l.email || "—"}
                                </td>
                                <td className="px-4 py-3">
                                  {l.website ? (
                                    <a
                                      href={l.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[var(--accent)]"
                                    >
                                      Sitio
                                    </a>
                                  ) : (
                                    <span className="text-[var(--muted)]">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[var(--muted)]">
                                  {l.city || l.country}
                                </td>
                                <td className="px-4 py-3 text-[var(--muted)]">
                                  {l.niche || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
