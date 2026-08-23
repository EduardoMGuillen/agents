"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/leads", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/approvals", label: "Mensajes" },
  { href: "/campaigns", label: "Prospecting" },
  { href: "/settings", label: "Ajustes" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[220px] shrink-0 border-r border-[var(--line)] bg-[var(--sidebar)] md:flex md:flex-col">
        <Link
          href="/"
          className="flex items-center justify-center border-b border-[var(--line)] px-4 py-5"
        >
            <img
              src="/nexus-logo.png"
              alt="Nexus"
              className="h-16 w-16 object-contain bg-transparent"
            />
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <Link href="/leads" className="btn btn-primary mb-3 w-full">
            Nuevo lead
          </Link>
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-2 text-sm ${
                  active
                    ? "nav-active"
                    : "text-[var(--muted)] hover:bg-[var(--field)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--line)] px-3 py-3">
          <a
            href="https://www.nexusglobalsuministros.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            nexusglobalsuministros.com
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-[var(--line)] bg-[var(--sidebar)] px-4 py-2">
          <ThemeToggle />
        </header>
        <nav className="flex items-center gap-3 overflow-x-auto border-b border-[var(--line)] bg-[var(--sidebar)] px-3 py-2 md:hidden">
          <img
            src="/nexus-logo.png"
            alt="Nexus"
            width={36}
            height={36}
            className="h-9 w-9 object-contain bg-transparent"
          />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 text-sm text-[var(--muted)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 px-4 py-6 md:px-8 md:py-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
