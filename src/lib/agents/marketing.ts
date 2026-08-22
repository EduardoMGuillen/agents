import { chatJson, isLlmConfigured } from "@/lib/llm";
import { store } from "@/lib/store";
import { MARKETING_SYSTEM } from "@/lib/agents/prompts";
import type { Lead } from "@/lib/types";

export type ProspectInput = {
  niche: string;
  city: string;
  country?: string;
  locale?: "es" | "en";
  count?: number;
  campaignName?: string;
};

type ProspectLead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string;
  website: string | null;
  city: string;
  country: string;
  locale: "es" | "en";
  niche: string;
  notes: string;
  score: number;
};

function localProspects(input: ProspectInput): ProspectLead[] {
  const locale = input.locale ?? "es";
  const country = input.country ?? "MX";
  const templates =
    locale === "en"
      ? [
          "Downtown Dental Clinic",
          "Harbor Grill Restaurant",
          "Summit Auto Repair",
          "Bright Smile Orthodontics",
          "Cedar Law Office",
          "Fresh Basket Market",
        ]
      : [
          "Clínica Dental Centro",
          "Restaurante El Puerto",
          "Taller Mecánico Norte",
          "Óptica Visión Clara",
          "Despacho Jurídico López",
          "Boutique Luna",
        ];

  const n = Math.min(input.count ?? 5, templates.length);
  return templates.slice(0, n).map((company, i) => ({
    name: null,
    email: null,
    phone: null,
    company: `${company} ${input.city}`,
    website: null,
    city: input.city,
    country,
    locale,
    niche: input.niche,
    notes:
      locale === "en"
        ? `Prospect for ${input.niche} in ${input.city}. Likely needs a modern website. Verify email before outreach.`
        : `Prospecto de ${input.niche} en ${input.city}. Probable necesidad de web moderna. Verificar email antes de outreach.`,
    score: 40 + i * 5,
  }));
}

export async function runMarketingProspect(input: ProspectInput) {
  const locale = input.locale ?? "es";
  const country = input.country ?? "MX";
  const count = Math.min(Math.max(input.count ?? 5, 1), 8);

  let prospects: ProspectLead[] = [];

  if (isLlmConfigured()) {
    try {
      const result = await chatJson<{ leads: ProspectLead[] }>({
        system: MARKETING_SYSTEM,
        user: JSON.stringify({
          niche: input.niche,
          city: input.city,
          country,
          locale,
          count,
          instruction:
            "Generate realistic business prospects. Prefer null email over fake personal emails.",
        }),
      });
      prospects = (result.leads ?? []).slice(0, count);
    } catch {
      prospects = localProspects({ ...input, count, locale, country });
    }
  } else {
    prospects = localProspects({ ...input, count, locale, country });
  }

  const campaign = await store.createCampaign({
    name:
      input.campaignName ||
      `${input.niche} — ${input.city} (${new Date().toISOString().slice(0, 10)})`,
    niche: input.niche,
    city: input.city,
    country,
    locale,
    status: "active",
    notes: `Generado por marketing_agent (${prospects.length} leads)`,
  });

  const created: Lead[] = [];
  for (const p of prospects) {
    const lead = await store.createLead({
      name: p.name,
      email: p.email,
      phone: p.phone,
      company: p.company,
      website: p.website,
      city: p.city || input.city,
      country: p.country || country,
      locale: p.locale || locale,
      niche: p.niche || input.niche,
      notes: p.notes,
      score: p.score ?? 40,
      source: "marketing_agent",
      status: "new",
    });
    created.push(lead);
  }

  await store.createEvent({
    agent: "marketing_agent",
    event_type: "prospect_batch",
    payload: {
      campaignId: campaign.id,
      count: created.length,
      niche: input.niche,
      city: input.city,
    },
  });

  return { campaign, leads: created };
}
