"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MailCheck,
  Megaphone,
  Settings,
  ExternalLink,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/approvals", label: "Approvals", icon: MailCheck },
  { href: "/campaigns", label: "Marketing", icon: Megaphone },
  { href: "/settings", label: "Setup", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-0 md:gap-6 md:px-6 md:py-6">
      <aside className="panel sticky top-0 hidden h-screen w-60 shrink-0 flex-col p-4 md:flex md:h-[calc(100vh-3rem)] md:sticky md:top-6">
        <div className="mb-8 px-2">
          <p
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            Nexus Office
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Sales + Marketing · tú eres Dev
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--bg-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--text)]"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <a
          href="https://www.nexusglobalsuministros.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ExternalLink size={14} />
          nexusglobalsuministros.com
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b border-[var(--line)] px-4 py-3 md:hidden">
          <span
            className="mr-2 shrink-0 font-bold"
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            Nexus
          </span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-[var(--muted)]"
            >
              {item.label}
            </Link>
          ))}
        </header>
        <main className="flex-1 px-4 py-5 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}
