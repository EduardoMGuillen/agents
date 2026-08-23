import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import { searchContactablePlaces } from "@/lib/places";
import { importLeadRows } from "@/lib/import-leads";
import { localeFromCountry, normalizeCountry } from "@/lib/locale";
import { stringifyCampaignMeta } from "@/lib/campaign-meta";
import {
  clampProspectingLimit,
  prospectingLimitMax,
} from "@/lib/prospecting-limits";

export const runtime = "nodejs";
export const maxDuration = 800;

const schema = z.object({
  niche: z.string().min(2),
  city: z.string().min(2),
  country: z.string().optional(),
  limit: z.number().min(5).max(200).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const country = normalizeCountry(parsed.data.country || "HN");
  const locale = localeFromCountry(country);
  const limit = clampProspectingLimit(parsed.data.limit);

  try {
    const found = await searchContactablePlaces({
      niche: parsed.data.niche,
      city: parsed.data.city,
      country,
      locale,
      limit,
      thorough: true,
    });

    const campaign = await store.createCampaign({
      name: `Scrapling ${parsed.data.niche} · ${parsed.data.city}`,
      niche: parsed.data.niche,
      city: parsed.data.city,
      country,
      locale,
      status: found.withEmail.length ? "done" : "error",
      notes: stringifyCampaignMeta({
        kind: "scrapling",
        limit,
        scanned: found.scanned,
        withWebsite: found.withWebsite,
        withEmail: found.withEmail.length,
        leadIds: [],
      }),
    });

    if (found.scanned === 0) {
      return NextResponse.json(
        { error: "No encontré negocios en Google Maps para esa zona.", campaign },
        { status: 404 },
      );
    }

    if (found.withEmail.length === 0) {
      return NextResponse.json(
        {
          error: `Revisé ${found.scanned} negocios (${found.withWebsite} con web) y no hallé correo público. Prueba otro nicho o un CSV.`,
          found: found.scanned,
          withWebsite: found.withWebsite,
          withEmail: 0,
          campaign,
        },
        { status: 422 },
      );
    }

    const result = await importLeadRows(
      found.withEmail.map((p) => ({
        name: null,
        email: p.email,
        phone: p.phone,
        company: p.company,
        website: p.website,
        city: p.city,
        country,
        locale,
        niche: parsed.data.niche,
        notes: p.notes,
      })),
      "marketing_agent",
      campaign.name,
      {
        campaignId: campaign.id,
        meta: {
          kind: "scrapling",
          limit,
          scanned: found.scanned,
          withWebsite: found.withWebsite,
        },
      },
    );

    return NextResponse.json(
      {
        ...result,
        found: found.scanned,
        withWebsite: found.withWebsite,
        withEmail: found.withEmail.length,
        campaign,
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error buscando" },
      { status: 400 },
    );
  }
}

export async function GET() {
  const jobs = (await store.listCampaigns()).filter((c) =>
    ["queued", "running", "done", "error"].includes(c.status),
  );
  return NextResponse.json({ jobs, maxLimit: prospectingLimitMax() });
}
