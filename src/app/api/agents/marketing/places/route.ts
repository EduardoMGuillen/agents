import { NextResponse } from "next/server";
import { z } from "zod";
import { searchContactablePlaces } from "@/lib/places";
import { importLeadRows } from "@/lib/import-leads";
import { localeFromCountry, normalizeCountry } from "@/lib/locale";
import { clampProspectingLimit } from "@/lib/prospecting-limits";

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

  try {
    const country = normalizeCountry(parsed.data.country || "HN");
    const locale = localeFromCountry(country);
    const found = await searchContactablePlaces({
      niche: parsed.data.niche,
      city: parsed.data.city,
      country,
      locale,
      limit: clampProspectingLimit(parsed.data.limit),
    });

    if (found.scanned === 0) {
      return NextResponse.json(
        { error: "No encontré negocios en Google Maps para esa zona." },
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
      `Maps ${parsed.data.niche} · ${parsed.data.city}`,
    );

    return NextResponse.json(
      {
        ...result,
        found: found.scanned,
        withWebsite: found.withWebsite,
        withEmail: found.withEmail.length,
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
