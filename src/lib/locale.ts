const SPANISH_COUNTRIES = new Set([
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "ES",
  "GQ",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "UY",
  "VE",
  "BR",
]);

export function normalizeCountry(code: string | null | undefined) {
  const raw = (code || "").trim();
  if (!raw) return "HN";
  if (raw.length === 2) return raw.toUpperCase();
  const map: Record<string, string> = {
    honduras: "HN",
    mexico: "MX",
    "el salvador": "SV",
    salvador: "SV",
    nicaragua: "NI",
    guatemala: "GT",
    méxico: "MX",
    colombia: "CO",
    spain: "ES",
    espana: "ES",
    españa: "ES",
    "united states": "US",
    usa: "US",
    brazil: "BR",
    brasil: "BR",
    canada: "CA",
    uk: "GB",
    england: "GB",
    germany: "DE",
    francia: "FR",
    france: "FR",
    italy: "IT",
    italia: "IT",
    japan: "JP",
    australia: "AU",
  };
  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return map[key] ?? raw.slice(0, 2).toUpperCase();
}

export function localeFromCountry(country: string | null | undefined): "es" | "en" {
  const code = normalizeCountry(country);
  return SPANISH_COUNTRIES.has(code) ? "es" : "en";
}

const COUNTRY_LABEL: Record<string, string> = {
  HN: "Honduras",
  SV: "El Salvador",
  GT: "Guatemala",
  NI: "Nicaragua",
  MX: "México",
  CR: "Costa Rica",
  PA: "Panamá",
  CO: "Colombia",
  ES: "España",
  US: "Estados Unidos",
};

export function inferCountryFromCity(city: string, fallback = "HN") {
  const t = (city || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/\bguatemala\b/.test(t)) return "GT";
  if (/san salvador/.test(t)) return "SV";
  if (/tegucigalpa|san pedro sula|choloma/.test(t)) return "HN";
  if (/\bmexico\b|cdmx|ciudad de mexico|guadalajara|monterrey/.test(t)) {
    return "MX";
  }
  if (/bogota|medellin|cali/.test(t)) return "CO";
  if (/managua/.test(t)) return "NI";
  if (/san jose/.test(t) && /costa/.test(t)) return "CR";
  if (/miami|houston|los angeles|new york/.test(t)) return "US";
  if (/madrid|barcelona|valencia/.test(t)) return "ES";
  return normalizeCountry(fallback);
}

export const PROSPECT_COUNTRIES = [
  "HN",
  "GT",
  "SV",
  "NI",
  "CR",
  "PA",
  "MX",
  "CO",
  "US",
  "ES",
] as const;

export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  HN: [
    "Tegucigalpa",
    "San Pedro Sula",
    "Choloma",
    "La Ceiba",
    "El Progreso",
    "Comayagua",
    "Choluteca",
    "Puerto Cortés",
    "Danlí",
    "Siguatepeque",
  ],
  GT: [
    "Ciudad de Guatemala",
    "Mixco",
    "Villa Nueva",
    "Quetzaltenango",
    "Escuintla",
    "Antigua Guatemala",
    "Cobán",
    "Huehuetenango",
    "Puerto Barrios",
  ],
  SV: ["San Salvador", "Santa Ana", "San Miguel", "Soyapango", "Santa Tecla", "Mejicanos"],
  NI: ["Managua", "León", "Masaya", "Granada", "Estelí", "Chinandega"],
  CR: ["San José", "Alajuela", "Cartago", "Heredia", "Puntarenas", "Limón"],
  PA: ["Ciudad de Panamá", "San Miguelito", "Colón", "David", "La Chorrera"],
  MX: [
    "Ciudad de México",
    "Guadalajara",
    "Monterrey",
    "Puebla",
    "Tijuana",
    "León",
    "Mérida",
    "Cancún",
    "Querétaro",
  ],
  CO: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga"],
  US: [
    "Miami",
    "Houston",
    "Los Angeles",
    "New York",
    "Dallas",
    "Chicago",
    "Atlanta",
    "Orlando",
  ],
  ES: ["Madrid", "Barcelona", "Valencia", "Sevilla", "Málaga", "Bilbao"],
};

export function citiesForCountry(country: string) {
  return CITIES_BY_COUNTRY[normalizeCountry(country)] ?? [];
}

export function countryName(country: string | null | undefined) {
  const code = normalizeCountry(country);
  return COUNTRY_LABEL[code] ?? country ?? "";
}

