import { store } from "@/lib/store";
import type { CsvLeadRow } from "@/lib/csv";
import type { Campaign, Lead, LeadSource } from "@/lib/types";
import { localeFromCountry, normalizeCountry } from "@/lib/locale";
import { scoreImportedLead } from "@/lib/score";
import {
  parseCampaignMeta,
  stringifyCampaignMeta,
  type CampaignMeta,
} from "@/lib/campaign-meta";

function validEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  if (email.includes("protected") || email.includes("[email")) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function importLeadRows(
  rows: CsvLeadRow[],
  source: LeadSource,
  campaignNote: string,
  options?: {
    campaignId?: string;
    meta?: CampaignMeta;
  },
) {
  const existing = await store.listLeads();
  const byEmail = new Set(
    existing
      .map((l) => l.email?.toLowerCase())
      .filter((e): e is string => Boolean(e)),
  );

  const created: Lead[] = [];
  let skipped = 0;

  for (const row of rows) {
    const email = validEmail(row.email);
    if (!email) {
      skipped += 1;
      continue;
    }
    if (byEmail.has(email)) {
      skipped += 1;
      continue;
    }

    const country = normalizeCountry(row.country || "HN");
    const locale = localeFromCountry(country);

    const lead = await store.createLead({
      name: row.name,
      email,
      phone: row.phone,
      company: row.company,
      website: row.website,
      city: row.city,
      country,
      locale,
      niche: row.niche,
      notes: row.notes,
      source,
      status: "new",
      score: scoreImportedLead({
        email,
        website: row.website,
        phone: row.phone,
        niche: row.niche,
        company: row.company,
      }),
    });

    created.push(lead);
    byEmail.add(email);
  }

  const current = options?.campaignId
    ? (await store.listCampaigns()).find((c) => c.id === options.campaignId)
    : null;
  const meta: CampaignMeta = {
    ...parseCampaignMeta(current?.notes),
    ...options?.meta,
    kind:
      options?.meta?.kind ??
      (source === "csv_import" ? "csv" : "maps"),
    leadIds: created.map((l) => l.id),
    skipped,
    withEmail: created.length,
  };

  let campaign: Campaign | null = null;
  if (options?.campaignId) {
    campaign =
      (await store.updateCampaign(options.campaignId, {
        status: created.length ? "done" : "error",
        notes: stringifyCampaignMeta(meta),
      })) ?? null;
  } else if (created.length > 0) {
    const country = normalizeCountry(rows[0]?.country || "HN");
    campaign = await store.createCampaign({
      name: campaignNote,
      niche: rows[0]?.niche ?? null,
      city: rows[0]?.city ?? null,
      country,
      locale: localeFromCountry(country),
      status: "done",
      notes: stringifyCampaignMeta(meta),
    });
  }

  await store.createEvent({
    agent: "marketing_agent",
    event_type: "prospect_batch",
    payload: {
      campaignId: campaign?.id ?? null,
      count: created.length,
      skipped,
      source,
    },
  });

  return { campaign, leads: created, skipped };
}
