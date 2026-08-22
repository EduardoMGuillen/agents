const SKIP_HOST = /(google|facebook|instagram|youtube|tiktok|wa\.me|whatsapp|linktr\.ee|bit\.ly)/i;
const SKIP_EMAIL =
  /(noreply|no-reply|donotreply|privacy|legal|abuse|support@sentry|wixpress|example\.com|domain\.com|email\.com|yourdomain|schema\.org|sentry\.io|cloudflare|akamai)/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PREFERRED = /^(hola|info|contacto|contact|ventas|sales|hello|admin|oficina|reservas|hello)\@/i;

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function rankEmail(email: string, siteDomain: string | null) {
  let score = 10;
  if (PREFERRED.test(email)) score += 40;
  if (siteDomain && email.endsWith(`@${siteDomain}`)) score += 30;
  if (SKIP_EMAIL.test(email)) score -= 80;
  return score;
}

function extractEmails(html: string, siteDomain: string | null) {
  const fromMailto = [
    ...html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi),
  ].map((m) => m[1].toLowerCase());
  const fromText = html.match(EMAIL_RE)?.map((e) => e.toLowerCase()) ?? [];
  const unique = [...new Set([...fromMailto, ...fromText])].filter(
    (e) => !SKIP_EMAIL.test(e) && e.length < 80,
  );
  unique.sort((a, b) => rankEmail(b, siteDomain) - rankEmail(a, siteDomain));
  return unique;
}

async function fetchHtml(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "NexusOffice/1.0 (+https://www.nexusglobalsuministros.com/) contact-page lookup",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("html") && !ctype.includes("text")) return null;
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > 350_000 ? buf.slice(0, 350_000) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function contactUrls(website: string) {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return [];
  }
  if (SKIP_HOST.test(base.hostname)) return [];
  const origin = `${base.origin}/`;
  return [
    website,
    new URL("/contacto", origin).href,
    new URL("/contact", origin).href,
    new URL("/contactenos", origin).href,
    new URL("/contact-us", origin).href,
    new URL("/contacto.html", origin).href,
  ];
}

async function hunterEmail(domain: string) {
  const key = process.env.HUNTER_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(key)}&limit=5`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { emails?: Array<{ value?: string; type?: string; confidence?: number }> };
    };
    const hit = json.data?.emails?.find(
      (e) =>
        e.value &&
        (e.confidence ?? 0) >= 50 &&
        !SKIP_EMAIL.test(e.value.toLowerCase()),
    );
    return hit?.value?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export async function findPublicEmail(website: string | null) {
  if (!website) return null;
  const domain = domainOf(website);
  const urls = contactUrls(website);
  for (const url of urls.slice(0, 3)) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const emails = extractEmails(html, domain);
    if (emails[0]) return emails[0];
  }
  if (domain) return hunterEmail(domain);
  return null;
}

export async function enrichPlacesWithEmails<T extends { website: string | null; email: string | null }>(
  places: T[],
  concurrency = 4,
): Promise<T[]> {
  const out = new Array<T>(places.length);
  let i = 0;
  async function worker() {
    while (i < places.length) {
      const idx = i++;
      const place = places[idx];
      if (place.email) {
        out[idx] = place;
        continue;
      }
      const email = await findPublicEmail(place.website);
      out[idx] = { ...place, email };
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, places.length) }, () => worker()));
  return out;
}
