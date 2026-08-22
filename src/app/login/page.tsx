"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Error");
      return;
    }
    router.replace(params.get("next") || "/");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-[var(--line)] bg-[var(--paper)] px-14 py-12 md:flex">
        <p className="kicker">Nexus Global</p>
        <div>
          <h1 className="display text-6xl">
            Una mesa.
            <br />
            Un estudio.
          </h1>
          <p className="mt-6 max-w-sm text-[var(--muted)]">
            Dirección comercial privada.
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Solo personal autorizado
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        className="flex flex-col justify-center px-8 py-16 md:px-16"
      >
        <p className="kicker md:hidden">Nexus Global</p>
        <h2 className="display mt-4 text-4xl">Entrar</h2>
        <div className="mt-10 max-w-sm">
          <label className="label">Clave</label>
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        {error && (
          <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>
        )}
        <button className="btn btn-primary mt-10 w-fit" disabled={busy}>
          {busy ? "…" : "Continuar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="kicker p-12">Un momento</p>}>
      <LoginForm />
    </Suspense>
  );
}
