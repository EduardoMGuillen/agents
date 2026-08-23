"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="panel w-full max-w-sm p-7"
      >
        <div className="mb-5 flex justify-center">
          <img src="/nexus-logo.png" alt="Nexus" width={112} height={112} className="object-contain bg-transparent" />
        </div>
        <h1 className="display text-xl">Entrar</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Nexus Global · leads y outreach
        </p>
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
          {busy ? "…" : "Entrar"}
        </button>
      </motion.form>
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
