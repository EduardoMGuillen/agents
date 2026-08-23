"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

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
      <aside className="hidden w-[228px] shrink-0 border-r border-[var(--line)] bg-black md:flex md:flex-col">
        <Link href="/" className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-4">
          <motion.span
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className="relative block h-[72px] w-[72px] shrink-0"
          >
            <Image
              src="/NexusGPTHD.png"
              alt="Nexus"
              fill
              className="object-contain"
              priority
            />
          </motion.span>
          <span className="block text-[11px] text-[var(--muted)]">CRM con IA</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          <Link href="/leads" className="btn btn-primary mb-2 w-full">
            + Nuevo lead
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
                className={`relative block rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
                  active
                    ? "nav-active"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--ink)]"
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
          className="border-t border-[var(--line)] px-4 py-3 text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          nexusglobalsuministros.com
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex items-center gap-3 overflow-x-auto border-b border-[var(--line)] bg-black px-3 py-2 md:hidden">
          <Image src="/NexusGPTHD.png" alt="Nexus" width={40} height={40} className="object-contain" />
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 px-4 py-6 md:px-8 md:py-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
