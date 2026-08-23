import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import { localeFromCountry, normalizeCountry } from "@/lib/locale";

const schema = z.object({
  niche: z.string().min(2),
  city: z.string().min(2),
  country: z.string().optional(),
  limit: z.number().min(5).max(20).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const country = normalizeCountry(parsed.data.country || "HN");
  const locale = localeFromCountry(country);
  const limit = parsed.data.limit ?? 12;
  const campaign = await store.createCampaign({
    name: `Scrapling ${parsed.data.niche} · ${parsed.data.city}`,
    niche: parsed.data.niche,
    city: parsed.data.city,
    country,
    locale,
    status: "queued",
    notes: JSON.stringify({ kind: "scrapling", limit }),
  });

  return NextResponse.json(
    {
      job: campaign,
      hint: "Deja el worker en tu PC: npm run scrape:worker",
    },
    { status: 201 },
  );
}

export async function GET() {
  const jobs = (await store.listCampaigns()).filter((c) =>
    ["queued", "running", "done", "error"].includes(c.status),
  );
  return NextResponse.json({ jobs });
}
