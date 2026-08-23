import { enrichPlacesWithEmails } from "@/lib/enrich-email";
import { isLikelyChain } from "@/lib/chains";
import { localeFromCountry, normalizeCountry } from "@/lib/locale";
import { clampProspectingLimit, hostedOnVercel } from "@/lib/prospecting-limits";
import { isPlacesQuotaError, searchOsmPlaces } from "@/lib/osm-places";

export type Place = {
  company: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  notes: string;
  score: number;
};

type GooglePlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
};

type TextSearchResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
};

const COUNTRY_NAMES: Record<string, string> = {
  HN: "Honduras",
  MX: "Mexico",
  GT: "Guatemala",
  SV: "El Salvador",
  NI: "Nicaragua",
  CR: "Costa Rica",
  PA: "Panama",
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  ES: "Spain",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  PT: "Portugal",
  BR: "Brazil",
  CO: "Colombia",
  AR: "Argentina",
  CL: "Chile",
  PE: "Peru",
  EC: "Ecuador",
  BO: "Bolivia",
  PY: "Paraguay",
  UY: "Uruguay",
  VE: "Venezuela",
  DO: "Dominican Republic",
  CU: "Cuba",
  PR: "Puerto Rico",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  IN: "India",
  AU: "Australia",
  NZ: "New Zealand",
  AE: "United Arab Emirates",
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  PH: "Philippines",
  SG: "Singapore",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  IE: "Ireland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  PL: "Poland",
};

const PLACE_TYPES: Array<{ match: string; type: string }> = [
  { match: "restaurant", type: "restaurant" },
  { match: "restaurante", type: "restaurant" },
  { match: "cafe", type: "cafe" },
  { match: "clinica", type: "doctor" },
  { match: "clinic", type: "doctor" },
  { match: "dental", type: "dentist" },
  { match: "dentist", type: "dentist" },
  { match: "hotel", type: "hotel" },
  { match: "salon", type: "hair_salon" },
  { match: "gym", type: "gym" },
  { match: "abogado", type: "lawyer" },
  { match: "lawyer", type: "lawyer" },
  { match: "taller", type: "car_repair" },
  { match: "tienda", type: "store" },
  { match: "shop", type: "store" },
];

export function isGooglePlacesConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

function countryLabel(code: string) {
  const upper = code.trim().toUpperCase();
  return COUNTRY_NAMES[upper] ?? code;
}

function includedTypeFor(niche: string) {
  const key = niche
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return PLACE_TYPES.find((t) => key.includes(t.match))?.type;
}

function toPlace(p: GooglePlace, city: string): Place | null {
  const company = p.displayName?.text?.trim();
  if (!company) return null;
  if (p.businessStatus && p.businessStatus !== "OPERATIONAL") return null;

  const website = p.websiteUri?.trim() || null;
  const reviews = p.userRatingCount ?? 0;
  if (isLikelyChain({ company, website, reviewCount: reviews })) return null;

  const phone =
    p.internationalPhoneNumber?.trim() || p.nationalPhoneNumber?.trim() || null;
  const maps = p.googleMapsUri?.trim();
  const address = p.formattedAddress?.trim();
  const rating =
    typeof p.rating === "number" ? `${p.rating}★ (${reviews} reseñas)` : null;

  const notes = [
    website
      ? `Web en Google: ${website}. Evaluar rediseño.`
      : "Sin web en Google Maps — candidato a web nueva.",
    address ? `Dirección: ${address}` : null,
    rating,
    maps,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    company,
    website,
    email: null,
    phone,
    city,
    notes,
    score: website ? 48 : 72,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queryVariants(
  niche: string,
  city: string,
  country: string,
  locale: "es" | "en",
) {
  const where =
    locale === "en"
      ? `${niche} in ${city}, ${countryLabel(country)}`
      : `${niche} en ${city}, ${countryLabel(country)}`;
  const areas =
    locale === "en"
      ? ["downtown", "north", "south", "east", "west", "center"]
      : ["centro", "norte", "sur", "este", "oeste", "zona 1"];
  return [where, ...areas.map((area) => `${where} ${area}`)];
}

async function searchTextPage(
  apiKey: string,
  textQuery: string,
  languageCode: string,
  includedType: string | undefined,
  pageToken?: string,
): Promise<TextSearchResponse> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.rating,places.userRatingCount,nextPageToken",
    },
    body: JSON.stringify({
      textQuery,
      languageCode,
      maxResultCount: 20,
      ...(includedType ? { includedType } : {}),
      ...(pageToken ? { pageToken } : {}),
    }),
  });

  const json = (await res.json()) as TextSearchResponse;
  if (!res.ok) {
    const status = json.error?.status ? ` ${json.error.status}` : "";
    throw new Error(
      `${json.error?.message || "Google Places no respondió."}${status}`.trim(),
    );
  }
  return json;
}

export async function searchPlaces(input: {
  niche: string;
  city: string;
  country?: string;
  locale?: "es" | "en";
  limit?: number;
  requireWebsite?: boolean;
}): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const country = normalizeCountry(input.country || "HN");
  const locale = localeFromCountry(country);
  const limit = clampProspectingLimit(input.limit);

  if (!apiKey) {
    return searchOsmPlaces({
      niche: input.niche,
      city: input.city,
      country,
      limit,
      requireWebsite: input.requireWebsite,
    });
  }

  try {
    return await searchGooglePlaces({
      apiKey,
      niche: input.niche,
      city: input.city,
      country,
      locale,
      limit,
      requireWebsite: input.requireWebsite,
    });
  } catch (error) {
    if (!isPlacesQuotaError(error)) throw error;
    try {
      const osm = await searchOsmPlaces({
        niche: input.niche,
        city: input.city,
        country,
        limit,
        requireWebsite: input.requireWebsite,
      });
      if (osm.length === 0) {
        throw new Error(
          "Google Maps llegó al cupo diario y OpenStreetMap no encontró negocios en esa zona. Prueba otro nicho o espera a que se reinicie la cuota.",
        );
      }
      return osm;
    } catch (osmError) {
      if (osmError instanceof Error && osmError.message.includes("cupo diario")) {
        throw osmError;
      }
      const detail =
        osmError instanceof Error ? osmError.message : "OSM no respondió";
      throw new Error(
        `Google Maps llegó al cupo diario. Fallback OpenStreetMap: ${detail}`,
      );
    }
  }
}

async function searchGooglePlaces(input: {
  apiKey: string;
  niche: string;
  city: string;
  country: string;
  locale: "es" | "en";
  limit: number;
  requireWebsite?: boolean;
}): Promise<Place[]> {
  const languageCode = input.locale === "en" ? "en" : "es";
  const includedType = includedTypeFor(input.niche);
  const queries = queryVariants(
    input.niche,
    input.city,
    input.country,
    input.locale,
  );
  const maxPages = hostedOnVercel() ? 2 : 8;
  const maxQueries = hostedOnVercel() ? 1 : queries.length;

  const seen = new Set<string>();
  const places: Place[] = [];

  for (let q = 0; q < maxQueries && places.length < input.limit; q++) {
    let pageToken: string | undefined;
    for (let page = 0; page < maxPages && places.length < input.limit; page++) {
      const json = await searchTextPage(
        input.apiKey,
        queries[q],
        languageCode,
        q === 0 ? includedType : undefined,
        pageToken,
      );
      const ranked = [...(json.places ?? [])].sort(
        (a, b) => (a.userRatingCount ?? 0) - (b.userRatingCount ?? 0),
      );
      for (const raw of ranked) {
        const place = toPlace(raw, input.city);
        if (!place) continue;
        if (input.requireWebsite && !place.website) continue;
        const key = place.company.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        places.push(place);
        if (places.length >= input.limit) break;
      }
      pageToken = json.nextPageToken;
      if (!pageToken) break;
      await sleep(1200);
    }
  }

  return places;
}

export async function searchContactablePlaces(input: {
  niche: string;
  city: string;
  country?: string;
  locale?: "es" | "en";
  limit?: number;
  thorough?: boolean;
  requireWebsite?: boolean;
}) {
  const places = await searchPlaces({
    ...input,
    requireWebsite: input.requireWebsite ?? Boolean(input.thorough),
  });
  const withWebsite = places.filter((p) => Boolean(p.website));
  const concurrency = hostedOnVercel()
    ? input.thorough
      ? 3
      : 4
    : input.thorough
      ? 8
      : 6;
  const enriched = await enrichPlacesWithEmails(
    withWebsite,
    concurrency,
    Boolean(input.thorough),
  );
  const withEmail = enriched.filter((p) => Boolean(p.email));
  return {
    scanned: places.length,
    withWebsite: withWebsite.length,
    withEmail,
    source: places[0]?.notes.includes("OpenStreetMap") ? "osm" : "maps",
  };
}
