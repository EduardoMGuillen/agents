function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

const CHAIN_NAMES = [
  "mcdonald",
  "mcdonalds",
  "burger king",
  "kfc",
  "kentucky fried",
  "pizza hut",
  "domino",
  "dominos",
  "subway",
  "starbucks",
  "dunkin",
  "tim hortons",
  "taco bell",
  "wendy",
  "popeyes",
  "chipotle",
  "five guys",
  "little caesars",
  "papa john",
  "walmart",
  "bodega aurrera",
  "sam s club",
  "costco",
  "target",
  "ikea",
  "home depot",
  "lowe s",
  "best buy",
  "seven eleven",
  "7 eleven",
  "7-eleven",
  "oxxo",
  "circle k",
  "shell",
  "bp ",
  "chevron",
  "exxon",
  "pemex",
  "terpel",
  "mobil",
  "hilton",
  "marriott",
  "hyatt",
  "holiday inn",
  "ihg",
  "sheraton",
  "westin",
  "novotel",
  "ibis",
  "hampton inn",
  "courtyard",
  "fairfield inn",
  "accor",
  "h&m",
  "zara",
  "uniqlo",
  "forever 21",
  "gap ",
  "old navy",
  "nike ",
  "adidas",
  "puma ",
  "sephora",
  "ulta",
  "walgreens",
  "cvs ",
  "rite aid",
  "boots",
  "carrefour",
  "tesco",
  "aldi",
  "lidl",
  "soriana",
  "chedraui",
  "coppel",
  "elektra",
  "liverpool",
  "palacio de hierro",
  "cinepolis",
  "cinemex",
  "amc ",
  "regal cinemas",
  "fedex",
  "ups store",
  "dhl",
  "claro",
  "tigo",
  "movistar",
  "telcel",
  "at&t",
  "verizon",
  "t-mobile",
  "apple store",
  "microsoft store",
  "amazon fresh",
  "whole foods",
  "trader joe",
  "starbucks coffee",
  "hard rock cafe",
  "tgif",
  "tgi friday",
  "outback",
  "chili s",
  "applebee",
  "olive garden",
  "red lobster",
  "planet fitness",
  "anytime fitness",
  "smart fit",
  "gold s gym",
  "curves",
  "hertz",
  "avis",
  "enterprise rent",
  "budget rent",
  "marriott",
  "holiday inn express",
  "days inn",
  "super 8",
  "motel 6",
  "best western",
  "wyndham",
  "radisson",
  "four seasons",
  "ritz carlton",
  "mcdonald s",
];

const CHAIN_HOSTS = [
  "mcdonalds.com",
  "bk.com",
  "burgerking",
  "kfc.com",
  "pizzahut.com",
  "dominos.com",
  "subway.com",
  "starbucks.com",
  "walmart.com",
  "ikea.com",
  "homedepot.com",
  "costco.com",
  "target.com",
  "hilton.com",
  "marriott.com",
  "hyatt.com",
  "ihg.com",
  "apple.com",
  "nike.com",
  "adidas.com",
  "hm.com",
  "zara.com",
  "uniqlo.com",
  "oxxo.com",
  "7-eleven.com",
  "shell.com",
  "bp.com",
  "chevron.com",
  "fedex.com",
  "ups.com",
  "dhl.com",
  "cinepolis.com",
  "cinemex.com",
  "smartfit.com",
  "planetfitness.com",
];

const CHAIN_HINT =
  /\b(sucursal|franquicia|franchise|outlet|flagship|mall\b|plaza comercial|s\.a\.b\.|nasdaq|nyse)\b/i;

function nameLooksLikeChain(company: string) {
  const folded = fold(company);
  const tokens = new Set(folded.split(" ").filter(Boolean));
  for (const raw of CHAIN_NAMES) {
    const n = fold(raw);
    if (!n) continue;
    if (n.includes(" ")) {
      if (folded.includes(n)) return true;
    } else if (n.length <= 3) {
      if (tokens.has(n)) return true;
    } else if (tokens.has(n) || folded.includes(` ${n} `) || folded.startsWith(`${n} `) || folded.endsWith(` ${n}`)) {
      if (folded === n || folded.startsWith(`${n} `) || folded.includes(` ${n} `) || folded.endsWith(` ${n}`)) {
        return true;
      }
    }
  }
  return false;
}

export function isLikelyChain(input: {
  company: string;
  website?: string | null;
  reviewCount?: number | null;
}) {
  if (CHAIN_HINT.test(input.company)) return true;
  if (nameLooksLikeChain(input.company)) return true;

  if (input.website) {
    try {
      const host = new URL(input.website).hostname.toLowerCase();
      if (CHAIN_HOSTS.some((h) => host.includes(h))) return true;
    } catch {
      /* ignore */
    }
  }

  // Very high review volume usually means a famous chain or giant venue
  if ((input.reviewCount ?? 0) >= 1800) return true;
  return false;
}
