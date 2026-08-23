import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseCampaignMeta } from "@/lib/campaign-meta";
import { prospectingLimitMax } from "@/lib/prospecting-limits";
import type { Lead } from "@/lib/types";

export async function GET() {
  const [campaigns, leads] = await Promise.all([
    store.listCampaigns(),
    store.listLeads(),
  ]);
  const byId = new Map(leads.map((l) => [l.id, l]));
  const used = new Set<string>();

  const batches = campaigns.map((campaign) => {
    const meta = parseCampaignMeta(campaign.notes);
    const batchLeads = (meta.leadIds ?? [])
      .map((id) => byId.get(id))
      .filter((l): l is Lead => Boolean(l));
    for (const lead of batchLeads) used.add(lead.id);
    return { campaign, meta, leads: batchLeads };
  });

  const leftover = leads.filter(
    (l) =>
      !used.has(l.id) &&
      (l.source === "marketing_agent" || l.source === "csv_import"),
  );
  if (leftover.length) {
    batches.push({
      campaign: {
        id: "otros",
        name: "Otras búsquedas",
        niche: null,
        city: null,
        country: "",
        locale: "es",
        status: "done",
        notes: null,
        created_at: leftover[0]?.created_at ?? new Date().toISOString(),
        updated_at: leftover[0]?.updated_at ?? new Date().toISOString(),
      },
      meta: { kind: "otros", leadIds: leftover.map((l) => l.id) },
      leads: leftover,
    });
  }

  return NextResponse.json({
    batches,
    maxLimit: prospectingLimitMax(),
  });
}
