"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nicheSearchText } from "@/lib/osm-niches";

export type HuntMode = "places" | "scrapling" | "csv";

export type HuntInfo = {
  mode: HuntMode;
  niche?: string;
  city?: string;
  country?: string;
  limit?: number;
};

const STEPS: Record<HuntMode, string[]> = {
  places: [
    "Consultando Google Maps",
    "Descartando cadenas",
    "Abriendo sitios públicos",
    "Buscando correos de contacto",
  ],
  scrapling: [
    "Buscando PYMEs en Maps",
    "Recorriendo zonas de la ciudad",
    "Scrapeando webs públicas",
    "Extrayendo emails visibles",
  ],
  csv: ["Leyendo el archivo", "Validando emails", "Descartando duplicados"],
};

const MODE_TITLE: Record<HuntMode, string> = {
  places: "Búsqueda en Maps",
  scrapling: "Scrapling",
  csv: "Importando CSV",
};

export function ProspectingOverlay({ hunt }: { hunt: HuntInfo | null }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    if (!hunt) {
      setStep(0);
      setElapsed(0);
      setProgress(8);
      return;
    }
    const steps = STEPS[hunt.mode];
    const stepTimer = window.setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 2800);
    const clock = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    const bar = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.max(0.4, (92 - p) * 0.035)));
    }, 400);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(clock);
      window.clearInterval(bar);
    };
  }, [hunt]);

  const steps = hunt ? STEPS[hunt.mode] : [];
  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      {hunt && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="panel relative w-full max-w-md overflow-hidden p-6"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5 flex items-center gap-4">
              <div className="hunt-orb" aria-hidden />
              <div>
                <p className="kicker">{MODE_TITLE[hunt.mode]}</p>
                <h2 className="display mt-1 text-xl">Buscando leads</h2>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 text-sm">
              {hunt.mode !== "csv" ? (
                <>
                  <Info label="Nicho" value={nicheSearchText(hunt.niche || "") || "—"} />
                  <Info label="Ciudad" value={hunt.city || "—"} />
                  <Info label="País" value={hunt.country || "—"} />
                  <Info label="Máximo" value={String(hunt.limit ?? "—")} />
                </>
              ) : (
                <Info label="Fuente" value="CSV" />
              )}
            </div>

            <p className="text-sm font-medium text-[var(--accent)]">
              {steps[step]}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {elapsed < 20
                ? "Maps y las webs tardan un poco. No cierres esta ventana."
                : "Sigue trabajando en segundo plano. Un lote grande puede tomar minutos."}
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--field)]">
              <motion.div
                className="h-full rounded-full bg-[var(--accent)]"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.4 }}
              />
            </div>
            <p className="mt-2 text-right text-[11px] text-[var(--muted)]">
              {mins}:{secs}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
