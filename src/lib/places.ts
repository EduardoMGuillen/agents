type Place = {
  company: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  notes: string;
  score: number;
};

const NICHE_FILTERS: Record<string, string[]> = {
  restaurante: [
    'nwr["amenity"="restaurant"]',
    'nwr["amenity"="cafe"]',
    'nwr["amenity"="fast_food"]',
  ],
  restaurant: [
    'nwr["amenity"="restaurant"]',
    'nwr["amenity"="cafe"]',
  ],
  clinica: [
    'nwr["amenity"="clinic"]',
    'nwr["amenity"="doctors"]',
    'nwr["amenity"="hospital"]',
  ],
  dental: ['nwr["amenity"="dentist"]'],
  dentist: ['nwr["amenity"="dentist"]'],
  hotel: ['nwr["tourism"="hotel"]'],
  salon: ['nwr["shop"="hairdresser"]', 'nwr["shop"="beauty"]'],
  taller: ['nwr["shop"="car_repair"]', 'nwr["craft"="carpenter"]'],
  tienda: ['nwr["shop"]'],
  shop: ['nwr["shop"]'],
  gym: ['nwr["leisure"="fitness_centre"]'],
  abogado: ['nwr["office"="lawyer"]'],
  lawyer: ['nwr["office"="lawyer"]'],
};

function filtersForNiche(niche: string): string[] {
  const key = niche
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(NICHE_FILTERS)) {
    if (key.includes(k)) return v;
  }
  return [
    'nwr["amenity"="restaurant"]',
    'nwr["shop"]',
    'nwr["office"]',
    'nwr["amenity"="clinic"]',
  ];
}

async function geocodeCity(city: string, country: string) {
  const q = encodeURIComponent(`${city}, ${country}`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
    {
      headers: {
        "User-Agent": "NexusAtelier/1.0 (nexusglobalsuministros.com)",
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) throw new Error("No se pudo geocodificar la ciudad");
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data[0]) throw new Error(`No encontré la ciudad ${city}`);
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}

function tag(tags: Record<string, string> | undefined, ...keys: string[]) {
  if (!tags) return null;
  for (const k of keys) {
    if (tags[k]) return tags[k];
  }
  return null;
}

export async function searchPlaces(input: {
  niche: string;
  city: string;
  country?: string;
  radiusM?: number;
  limit?: number;
}): Promise<Place[]> {
  const country = input.country || "MX";
  const limit = Math.min(Math.max(input.limit ?? 25, 5), 40);
  const radius = input.radiusM ?? 8000;
  const { lat, lon } = await geocodeCity(input.city, country);

  const clauses = filtersForNiche(input.niche)
    .map((f) => `${f}(around:${radius},${lat},${lon});`)
    .join("\n");

  const query = `[out:json][timeout:12];(${clauses});out tags center ${limit};`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "NexusAtelier/1.0 (nexusglobalsuministros.com)",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error("OpenStreetMap no respondió. Intenta de nuevo en un minuto.");
  }

  const json = (await res.json()) as {
    elements?: Array<{ tags?: Record<string, string> }>;
  };

  const seen = new Set<string>();
  const places: Place[] = [];

  for (const el of json.elements ?? []) {
    const name = tag(el.tags, "name", "name:es", "brand");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const website = tag(
      el.tags,
      "website",
      "contact:website",
      "url",
    );
    const email = tag(el.tags, "email", "contact:email");
    const phone = tag(el.tags, "phone", "contact:phone", "mobile");

    const hasWeb = Boolean(website);
    places.push({
      company: name,
      website,
      email: email && email.includes("@") ? email : null,
      phone,
      city: input.city,
      notes: hasWeb
        ? `Web pública: ${website}. Evaluar si conviene rediseño.`
        : "Sin sitio web en directorio público — candidato a oferta Nexus.",
      score: hasWeb ? 48 : 72,
    });
    if (places.length >= limit) break;
  }

  return places;
}
