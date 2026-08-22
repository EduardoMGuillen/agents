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

export function countryName(country: string | null | undefined) {
  const code = normalizeCountry(country);
  return COUNTRY_LABEL[code] ?? country ?? "";
}

