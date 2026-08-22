import { NextResponse } from "next/server";
import { z } from "zod";
import { searchPlaces } from "@/lib/places";
import { importLeadRows } from "@/lib/import-leads";

const schema = z.object({
  niche: z.string().min(2),
  city: z.string().min(2),
  country: z.string().optional(),
  locale: z.enum(["es", "en"]).optional(),
  limit: z.number().min(5).max(40).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const places = await searchPlaces({
      niche: parsed.data.niche,
      city: parsed.data.city,
      country: parsed.data.country,
      limit: parsed.data.limit ?? 25,
    });

    if (places.length === 0) {
      return NextResponse.json(
        { error: "No encontré negocios públicos en esa zona. Prueba otro nicho o ciudad." },
        { status: 404 },
      );
    }

    const locale = parsed.data.locale ?? "es";
    const result = await importLeadRows(
      places.map((p) => ({
        name: null,
        email: p.email,
        phone: p.phone,
        company: p.company,
        website: p.website,
        city: p.city,
        country: parsed.data.country || "MX",
        locale,
        niche: parsed.data.niche,
        notes: p.notes,
      })),
      "marketing_agent",
      `Directorio ${parsed.data.niche} · ${parsed.data.city}`,
    );

    return NextResponse.json(
      { ...result, found: places.length },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error buscando" },
      { status: 400 },
    );
  }
}
