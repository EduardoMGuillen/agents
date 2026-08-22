import { store } from "@/lib/store";
import type { CsvLeadRow } from "@/lib/csv";
import type { Lead, LeadSource } from "@/lib/types";

function keyOf(company: string, city: string | null) {
  return `${company.trim().toLowerCase()}|${(city || "").trim().toLowerCase()}`;
}

export async function importLeadRows(
  rows: CsvLeadRow[],
  source: LeadSource,
  campaignNote: string,
) {
  const existing = await store.listLeads();
  const byEmail = new Set(
    existing
      .map((l) => l.email?.toLowerCase())
      .filter((e): e is string => Boolean(e)),
  );
  const byCompany = new Set(
    existing.map((l) => keyOf(l.company || "", l.city)),
  );

  const created: Lead[] = [];
  let skipped = 0;

  for (const row of rows) {
    const email = row.email?.toLowerCase() || null;
    if (email && byEmail.has(email)) {
      skipped += 1;
      continue;
    }
    const ck = keyOf(row.company || "", row.city);
    if (byCompany.has(ck)) {
      skipped += 1;
      continue;
    }

    const lead = await store.createLead({
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      website: row.website,
      city: row.city,
      country: row.country || "MX",
      locale: row.locale || "es",
      niche: row.niche,
      notes: row.notes,
      source,
      status: "new",
      score: row.email ? 55 : row.website ? 45 : 70,
    });

    created.push(lead);
    if (email) byEmail.add(email);
    byCompany.add(ck);
  }

  const campaign = await store.createCampaign({
    name: campaignNote,
    niche: rows[0]?.niche ?? null,
    city: rows[0]?.city ?? null,
    country: rows[0]?.country || "MX",
    locale: rows[0]?.locale || "es",
    status: "active",
    notes: `${created.length} altas, ${skipped} omitidas (duplicado)`,
  });

  await store.createEvent({
    agent: "marketing_agent",
    event_type: "prospect_batch",
    payload: {
      campaignId: campaign.id,
      count: created.length,
      skipped,
      source,
    },
  });

  return { campaign, leads: created, skipped };
}
