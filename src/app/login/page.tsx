"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="panel w-full max-w-md space-y-4 p-6">
        <div>
          <p className="text-sm text-[var(--accent)]">Nexus Office</p>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            Acceso
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Panel de sales/marketing. Solo tú.
          </p>
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-[var(--muted)]">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
