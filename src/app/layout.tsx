import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const sans = IBM_Plex_Sans({
  variable: "--font-sans-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nexus — CRM con IA",
  description: "Leads, agentes y outreach para Nexus Global",
  icons: { icon: "/NexusGPTHD.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${sans.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
