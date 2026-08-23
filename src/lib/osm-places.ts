import { isLikelyChain } from "@/lib/chains";
import { normalizeCountry } from "@/lib/locale";
import type { Place } from "@/lib/places";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const UA =
  "NexusOffice/1.0 (https://www.nexusglobalsuministros.com/; prospecting fallback)";

type OsmTags = Record<string, string | undefined>;

type OsmElement = {
  type: string;
  id: number;
  tags?: OsmTags;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

type NominatimHit = {
  boundingbox?: [string, string, string, string];
  display_name?: string;
};

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function osmFilters(niche: string) {
  const key = fold(niche);
  const rules: Array<{ match: string; filters: string[] }> = [
    {
      match: "restaurant",
      filters: ['nwr["amenity"="restaurant"]', 'nwr["amenity"="fast_food"]'],
    },
    {
      match: "restaurante",
      filters: ['nwr["amenity"="restaurant"]', 'nwr["amenity"="fast_food"]'],
    },
    { match: "cafe", filters: ['nwr["amenity"="cafe"]'] },
    {
      match: "clinica",
      filters: ['nwr["amenity"="clinic"]', 'nwr["amenity"="doctors"]'],
    },
    {
      match: "clinic",
      filters: ['nwr["amenity"="clinic"]', 'nwr["amenity"="doctors"]'],
    },
    { match: "dental", filters: ['nwr["amenity"="dentist"]'] },
    { match: "dentist", filters: ['nwr["amenity"="dentist"]'] },
    { match: "hotel", filters: ['nwr["tourism"="hotel"]'] },
    { match: "salon", filters: ['nwr["shop"="hairdresser"]'] },
    { match: "gym", filters: ['nwr["leisure"="fitness_centre"]'] },
    { match: "abogado", filters: ['nwr["office"="lawyer"]'] },
    { match: "lawyer", filters: ['nwr["office"="lawyer"]'] },
    { match: "taller", filters: ['nwr["shop"="car_repair"]'] },
    { match: "farmacia", filters: ['nwr["amenity"="pharmacy"]'] },
    { match: "pharmacy", filters: ['nwr["amenity"="pharmacy"]'] },
    { match: "tienda", filters: ['nwr["shop"]'] },
    { match: "shop", filters: ['nwr["shop"]'] },
  ];
  const hit = rules.find((r) => key.includes(r.match));
  if (hit) return hit.filters;
  const safe = niche.replace(/["\\[\]()~]/g, "").slice(0, 40);
  if (!safe.trim()) return ['nwr["shop"]', 'nwr["amenity"]'];
  return [
    `nwr["name"~"${safe}",i]`,
    `nwr["shop"]["name"~"${safe}",i]`,
    `nwr["amenity"]["name"~"${safe}",i]`,
    `nwr["office"]["name"~"${safe}",i]`,
  ];
}

async function nominatimBbox(city: string, country: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${city}, ${country}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", country.toLowerCase());
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("OpenStreetMap (Nominatim) no encontró esa ciudad.");
  }
  const json = (await res.json()) as NominatimHit[];
  const box = json[0]?.boundingbox;
  if (!box || box.length < 4) {
    throw new Error(
      `OpenStreetMap no localizó “${city}” en ${country}. Prueba otro nombre de ciudad.`,
    );
  }
  const south = box[0];
  const north = box[1];
  const west = box[2];
  const east = box[3];
  return { south, west, north, east };
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

function toPlace(el: OsmElement, city: string): Place | null {
  const tags = el.tags ?? {};
  const company = tags.name?.trim();
  if (!company) return null;
  const website = websiteOf(tags);
  if (isLikelyChain({ company, website, reviewCount: 0 })) return null;
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
    website ? `Web OSM: ${website}. Evaluar rediseño.` : "Sin web en OSM — candidato a web nueva.",
    address ? `Dirección: ${address}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    company,
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
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) {
        lastError = new Error(`Overpass ${res.status}`);
        continue;
      }
      return (await res.json()) as { elements?: OsmElement[] };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Overpass falló");
    }
  }
  throw lastError ?? new Error("OpenStreetMap Overpass no respondió.");
}

export async function searchOsmPlaces(input: {
  niche: string;
  city: string;
  country?: string;
  limit: number;
  requireWebsite?: boolean;
}): Promise<Place[]> {
  const country = normalizeCountry(input.country || "HN");
  const bbox = await nominatimBbox(input.city, country);
  const filters = osmFilters(input.niche)
    .map((f) => `  ${f}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});`)
    .join("\n");
  const query = `[out:json][timeout:25];
(
${filters}
);
out tags center ${Math.min(Math.max(input.limit * 3, 40), 250)};`;

  const json = await overpass(query);
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const el of json.elements ?? []) {
    const place = toPlace(el, input.city);
    if (!place) continue;
    if (input.requireWebsite && !place.website) continue;
    const key = place.company.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
    if (places.length >= input.limit) break;
  }
  return places;
}

export function isPlacesQuotaError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return /quota exceeded|resource.?exhausted|rate.?limit|too many requests|429/i.test(
    msg,
  );
}
