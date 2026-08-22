function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function normHeader(h: string) {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_MAP: Record<string, string> = {
  company: "company",
  empresa: "company",
  negocio: "company",
  business: "company",
  name: "name",
  nombre: "name",
  contact: "name",
  contacto: "name",
  email: "email",
  correo: "email",
  mail: "email",
  e_mail: "email",
  phone: "phone",
  telefono: "phone",
  tel: "phone",
  whatsapp: "phone",
  website: "website",
  web: "website",
  url: "website",
  sitio: "website",
  site: "website",
  city: "city",
  ciudad: "city",
  country: "country",
  pais: "country",
  locale: "locale",
  idioma: "locale",
  niche: "niche",
  nicho: "niche",
  rubro: "niche",
  notes: "notes",
  notas: "notes",
};

export type CsvLeadRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  city: string | null;
  country: string;
  locale: "es" | "en";
  niche: string | null;
  notes: string | null;
};

export function parseLeadsCsv(text: string): CsvLeadRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => HEADER_MAP[normHeader(h)] || normHeader(h));
  const rows: CsvLeadRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const rec: Record<string, string> = {};
    headers.forEach((key, i) => {
      if (key) rec[key] = cols[i] || "";
    });

    const company = rec.company || rec.name || "";
    if (!company && !rec.email) continue;

    const locale = rec.locale?.toLowerCase().startsWith("en") ? "en" : "es";
    const email = rec.email?.includes("@") ? rec.email : null;

    rows.push({
      name: rec.name || null,
      email,
      phone: rec.phone || null,
      company: company || rec.email || "Sin nombre",
      website: rec.website || null,
      city: rec.city || null,
      country: rec.country || "MX",
      locale,
      niche: rec.niche || null,
      notes: rec.notes || null,
    });
  }

  return rows;
}
