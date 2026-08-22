const FREE_MAIL =
  /(gmail|hotmail|yahoo|outlook|live|icloud|proton|aol)\./i;

const HOT_NICHE =
  /restaurant|comida|bistro|cafe|clinica|salud|dental|belleza|salon|hotel|turismo|hospedaje|taller|auto|calzado|ropa|tienda/i;

const WARM_NICHE =
  /educa|legal|abogad|profesional|marketing|evento|jardin|funerar|logist/i;

export function scoreImportedLead(input: {
  email: string;
  website?: string | null;
  phone?: string | null;
  niche?: string | null;
  company?: string | null;
}) {
  let score = 40;
  const domain = input.email.split("@")[1] || "";
  score += FREE_MAIL.test(domain) ? 6 : 14;
  if (input.website) score += 8;
  if (input.phone) score += 6;
  const niche = input.niche || "";
  if (HOT_NICHE.test(niche)) score += 12;
  else if (WARM_NICHE.test(niche)) score += 8;
  else if (niche.trim()) score += 4;
  const company = input.company || "";
  if (/\b(s\.?\s*de\s*r\.?\s*l|s\.?\s*a\.?)\b/i.test(company)) score += 3;
  return Math.min(92, Math.max(28, score));
}
