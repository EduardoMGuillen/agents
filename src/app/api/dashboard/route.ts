import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isLlmConfigured } from "@/lib/llm";
import { isGooglePlacesConfigured } from "@/lib/places";
import { isMailConfigured, isResendConfigured, isSmtpConfigured } from "@/lib/mail";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { isPostgresConfigured } from "@/lib/db/pg";

export async function GET() {
  const [stats, events, campaigns] = await Promise.all([
    store.stats(),
    store.listEvents(20),
    store.listCampaigns(),
  ]);

  return NextResponse.json({
    stats,
    events,
    campaigns,
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
