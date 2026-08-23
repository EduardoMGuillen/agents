import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isLlmConfigured } from "@/lib/llm";
import { isGooglePlacesConfigured } from "@/lib/places";
import { isMailConfigured, isResendConfigured, isSmtpConfigured } from "@/lib/mail";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { isPostgresConfigured } from "@/lib/db/pg";
import { LEAD_STATUSES } from "@/lib/types";

export async function GET() {
  const [stats, events, campaigns, leads] = await Promise.all([
    store.stats(),
    store.listEvents(20),
    store.listCampaigns(),
    store.listLeads(),
  ]);

  const pipeline = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length]),
  );
  const hotLeads = [...leads]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      company: l.company,
      email: l.email,
      niche: l.niche,
      country: l.country,
      status: l.status,
      score: l.score,
    }));

  return NextResponse.json({
    stats,
    events,
    campaigns,
    pipeline,
    hotLeads,
    config: {
      memoryMode: store.usingMemory(),
      backend: store.backend(),
      postgres: isPostgresConfigured(),
      supabase: isSupabaseConfigured(),
      resend: isResendConfigured(),
      smtp: isSmtpConfigured(),
      mail: isMailConfigured(),
      llm: isLlmConfigured(),
      googlePlaces: isGooglePlacesConfigured(),
      site:
        process.env.NEXT_PUBLIC_NEXUS_SITE ??
        "https://www.nexusglobalsuministros.com/",
    },
  });
}
