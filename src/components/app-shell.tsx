"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Atelier", n: "01" },
  { href: "/leads", label: "Cartera", n: "02" },
  { href: "/approvals", label: "Correspondencia", n: "03" },
  { href: "/campaigns", label: "Prospección", n: "04" },
  { href: "/settings", label: "Casa", n: "05" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-end justify-between border-b border-[var(--line)] px-6 py-5 md:px-10">
        <div>
          <p className="kicker">Nexus Global</p>
          <p className="display mt-1 text-3xl md:text-4xl">Atelier</p>
        </div>
        <a
          href="https://www.nexusglobalsuministros.com/"
          target="_blank"
          rel="noreferrer"
          className="hidden text-[11px] tracking-[0.16em] uppercase text-[var(--muted)] hover:text-[var(--ink)] md:inline"
        >
          nexusglobalsuministros.com
        </a>
      </header>

      <div className="flex min-h-[calc(100vh-5.5rem)]">
        <aside className="hidden w-56 shrink-0 border-r border-[var(--line)] px-6 py-8 md:block">
          <nav className="flex flex-col gap-5">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-baseline gap-3 text-[13px] tracking-[0.08em] ${
                    active ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span className="font-light tabular-nums text-[11px]">{item.n}</span>
                  <span className={active ? "border-b border-[var(--ink)] pb-0.5" : ""}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="flex gap-4 overflow-x-auto border-b border-[var(--line)] px-5 py-3 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="flex-1 px-5 py-8 md:px-12 md:py-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
