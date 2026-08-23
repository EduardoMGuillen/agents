import { enrichPlacesWithEmails } from "@/lib/enrich-email";
import { isLikelyChain } from "@/lib/chains";
import { localeFromCountry, normalizeCountry } from "@/lib/locale";

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
    throw new Error(
      json.error?.message ||
        "Google Places no respondió. Revisa la API key y que Places API (New) esté habilitada.",
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
}): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Falta GOOGLE_MAPS_API_KEY. Crea una clave en Google Cloud (Places API New) y ponla en Vercel y .env.local.",
    );
  }

  const country = normalizeCountry(input.country || "HN");
  const locale = localeFromCountry(country);
  const limit = Math.min(Math.max(input.limit ?? 20, 5), 20);
  const languageCode = locale === "en" ? "en" : "es";
  const where =
    locale === "en"
      ? `${input.niche} in ${input.city}, ${countryLabel(country)}`
      : `${input.niche} en ${input.city}, ${countryLabel(country)}`;
  const textQuery = `${where}`;
  const includedType = includedTypeFor(input.niche);

  const seen = new Set<string>();
  const places: Place[] = [];
  let pageToken: string | undefined;
  const fetchCap = Math.min(limit * 2, 40);

  for (let page = 0; page < 2 && places.length < fetchCap; page++) {
    const json = await searchTextPage(
      apiKey,
      textQuery,
      languageCode,
      includedType,
      pageToken,
    );
    const ranked = [...(json.places ?? [])].sort(
      (a, b) => (a.userRatingCount ?? 0) - (b.userRatingCount ?? 0),
    );
    for (const raw of ranked) {
      const place = toPlace(raw, input.city);
      if (!place) continue;
      const key = place.company.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      places.push(place);
      if (places.length >= fetchCap) break;
    }
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }

  return places.slice(0, limit);
}

export async function searchContactablePlaces(input: {
  niche: string;
  city: string;
  country?: string;
  locale?: "es" | "en";
  limit?: number;
  thorough?: boolean;
}) {
  const places = await searchPlaces(input);
  const withWebsite = places.filter((p) => Boolean(p.website));
  const enriched = await enrichPlacesWithEmails(
    withWebsite,
    input.thorough ? 3 : 4,
    Boolean(input.thorough),
  );
  const withEmail = enriched.filter((p) => Boolean(p.email));
  return {
    scanned: places.length,
    withWebsite: withWebsite.length,
    withEmail,
  };
}
