"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/approvals", label: "Approvals" },
  { href: "/campaigns", label: "Prospecting" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-[var(--line)] bg-white px-4 py-5 md:flex md:flex-col">
        <Link href="/" className="mb-8 px-2">
          <p className="text-[15px] font-semibold tracking-tight">Nexus</p>
          <p className="text-xs text-[var(--muted)]">Sales ops</p>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-2 text-sm ${
                  active
                    ? "bg-slate-100 font-medium text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-slate-50 hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <a
          href="https://www.nexusglobalsuministros.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 px-2 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
        >
          nexusglobalsuministros.com
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-3 overflow-x-auto border-b border-[var(--line)] bg-white px-4 py-3 md:hidden">
          <span className="mr-1 font-semibold">Nexus</span>
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
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
