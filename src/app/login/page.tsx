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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <form onSubmit={onSubmit} className="panel w-full max-w-sm p-6">
        <p className="text-sm font-semibold">Nexus</p>
        <h1 className="display mt-1 text-xl">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Internal sales ops.</p>
        <div className="mt-6">
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
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        <button className="btn btn-primary mt-5 w-full" disabled={busy}>
          {busy ? "…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-[var(--muted)]">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
