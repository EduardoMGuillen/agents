"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("nexus-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nexus-theme");
    const next: Theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    setTheme(next);
    applyTheme(next);
    setReady(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  if (!ready) {
    return (
      <button type="button" className="btn btn-ghost h-9 px-3 text-xs" disabled>
        Tema
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-ghost h-9 shrink-0 px-3 text-xs"
      onClick={toggle}
      aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
