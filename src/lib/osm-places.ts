import { isLikelyChain } from "@/lib/chains";
import { inferCountryFromCity, normalizeCountry } from "@/lib/locale";
import type { Place } from "@/lib/places";
import { nicheSearchText, osmFiltersForNiche } from "@/lib/osm-niches";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const UA =
  "NexusOffice/1.0 (https://www.nexusglobalsuministros.com/; prospecting fallback)";

type OsmTags = Record<string, string | undefined>;

type OsmElement = {
  tags?: OsmTags;
};

type NominatimHit = {
  boundingbox?: [string, string, string, string];
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  extratags?: Record<string, string>;
  address?: { city?: string; town?: string; village?: string };
};

function clampBbox(box: {
  south: string;
  west: string;
  north: string;
  east: string;
}) {
  const s = Number(box.south);
  const n = Number(box.north);
  const w = Number(box.west);
  const e = Number(box.east);
  const lat = (s + n) / 2;
  const lon = (w + e) / 2;
  const span = 0.22;
  return {
    south: (lat - span).toFixed(5),
    north: (lat + span).toFixed(5),
    west: (lon - span).toFixed(5),
    east: (lon + span).toFixed(5),
  };
}

async function nominatimBbox(city: string, country: string) {
  async function lookup(withCountryCode: boolean) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${city}, ${country}`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    if (withCountryCode) {
      url.searchParams.set("countrycodes", country.toLowerCase());
    }
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as NominatimHit[];
    return json[0]?.boundingbox ?? null;
  }
  const box = (await lookup(true)) || (await lookup(false));
  if (!box || box.length < 4) {
    throw new Error(
      `OpenStreetMap no localizó “${city}” en ${country}. Revisa el país (GT para Guatemala, HN para Honduras).`,
    );
  }
  return clampBbox({
    south: box[0],
    north: box[1],
    west: box[2],
    east: box[3],
  });
}

function websiteOf(tags: OsmTags) {
  const raw =
    tags.website?.trim() ||
    tags["contact:website"]?.trim() ||
    tags.url?.trim() ||
    "";
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function toPlaceFromTags(
  company: string,
  tags: OsmTags,
  city: string,
): Place | null {
  const name = company.trim();
  if (!name) return null;
  const website = websiteOf(tags);
  if (isLikelyChain({ company: name, website, reviewCount: 0 })) return null;
  const phone =
    tags.phone?.trim() ||
    tags["contact:phone"]?.trim() ||
    tags["contact:mobile"]?.trim() ||
    null;
  const email = tags.email?.trim() || tags["contact:email"]?.trim() || null;
  const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
    .filter(Boolean)
    .join(" ");
  const notes = [
    "Fuente: OpenStreetMap (fallback de Maps).",
    website
      ? `Web OSM: ${website}. Evaluar rediseño.`
      : "Sin web en OSM — candidato a web nueva.",
    address ? `Dirección: ${address}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    company: name,
    website,
    email,
    phone,
    city,
    notes,
    score: website ? 48 : 72,
  };
}

async function overpass(query: string) {
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 22000);
        const res = await fetch(endpoint, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "User-Agent": UA,
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: new URLSearchParams({ data: query }),
        });
        clearTimeout(timer);
        if (!res.ok) {
          lastError = new Error(`Overpass ${res.status}`);
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        return (await res.json()) as { elements?: OsmElement[] };
      } catch (e) {
        lastError = e instanceof Error ? e : new Error("Overpass falló");
      }
    }
  }
  throw lastError ?? new Error("OpenStreetMap Overpass no respondió.");
}

async function searchOverpass(input: {
  niche: string;
  city: string;
  country: string;
  limit: number;
  requireWebsite?: boolean;
}) {
  const bbox = await nominatimBbox(input.city, input.country);
  const filters = osmFiltersForNiche(input.niche)
    .map((f) => `  ${f}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});`)
    .join("\n");
  const query = `[out:json][timeout:18][maxsize:33554432];
(
${filters}
);
out center;`;
  const json = await overpass(query);
  const seen = new Set<string>();
  const withWeb: Place[] = [];
  const withoutWeb: Place[] = [];
  for (const el of json.elements ?? []) {
    const company = el.tags?.name?.trim();
    if (!company) continue;
    const place = toPlaceFromTags(company, el.tags ?? {}, input.city);
    if (!place) continue;
    const key = place.company.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (place.website) withWeb.push(place);
    else withoutWeb.push(place);
  }
  const ranked = [...withWeb, ...withoutWeb];
  if (input.requireWebsite && withWeb.length > 0) {
    return withWeb.slice(0, input.limit);
  }
  return ranked.slice(0, input.limit);
}

async function searchNominatimPois(input: {
  niche: string;
  city: string;
  country: string;
  limit: number;
  requireWebsite?: boolean;
}) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${nicheSearchText(input.niche)} ${input.city} ${input.country}`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(Math.min(input.limit, 40)));
  url.searchParams.set("countrycodes", input.country.toLowerCase());
  url.searchParams.set("extratags", "1");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status}`);
  }
  const hits = (await res.json()) as NominatimHit[];
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const hit of hits) {
    const company = hit.name?.trim() || hit.display_name?.split(",")[0]?.trim();
    if (!company) continue;
    const tags: OsmTags = {
      website: hit.extratags?.website,
      "contact:website": hit.extratags?.["contact:website"],
      phone: hit.extratags?.phone,
      email: hit.extratags?.email,
      "addr:city": hit.address?.city || hit.address?.town || hit.address?.village,
    };
    const place = toPlaceFromTags(company, tags, input.city);
    if (!place) continue;
    const key = place.company.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
    if (places.length >= input.limit) break;
  }
  return places;
}

export async function searchOsmPlaces(input: {
  niche: string;
  city: string;
  country?: string;
  limit: number;
  requireWebsite?: boolean;
}): Promise<Place[]> {
  const country = inferCountryFromCity(input.city, input.country || "HN");
  try {
    const fromOverpass = await searchOverpass({
      ...input,
      country,
    });
    if (fromOverpass.length > 0) return fromOverpass;
  } catch {
    // Nominatim search is the backup when Overpass 500s.
  }
  const fromNominatim = await searchNominatimPois({
    ...input,
    country,
  });
  if (fromNominatim.length === 0) {
    throw new Error(
      "OpenStreetMap no devolvió negocios (Overpass ocupado). Prueba un nicho más concreto o espera unos minutos.",
    );
  }
  return fromNominatim;
}

export function isPlacesQuotaError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return /quota exceeded|resource.?exhausted|rate.?limit|too many requests|429/i.test(
    msg,
  );
}
