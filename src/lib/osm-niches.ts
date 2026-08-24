export type OsmNiche = {
  value: string;
  label: string;
  group: string;
  query: string;
  filters: string[];
};

export const OSM_NICHE_GROUPS = [
  "Comida y bebida",
  "Salud",
  "Belleza y deporte",
  "Comercio",
  "Automotriz",
  "Servicios profesionales",
  "Hospedaje y turismo",
  "Educación y oficios",
] as const;

export const OSM_NICHES: OsmNiche[] = [
  { value: "restaurante", label: "Restaurante", group: "Comida y bebida", query: "restaurante", filters: ['node["amenity"="restaurant"]'] },
  { value: "comida_rapida", label: "Comida rápida", group: "Comida y bebida", query: "comida rápida", filters: ['node["amenity"="fast_food"]'] },
  { value: "cafe", label: "Café", group: "Comida y bebida", query: "café", filters: ['node["amenity"="cafe"]'] },
  { value: "bar", label: "Bar", group: "Comida y bebida", query: "bar", filters: ['node["amenity"="bar"]'] },
  { value: "pub", label: "Pub", group: "Comida y bebida", query: "pub", filters: ['node["amenity"="pub"]'] },
  { value: "heladeria", label: "Heladería", group: "Comida y bebida", query: "heladería", filters: ['node["amenity"="ice_cream"]'] },
  { value: "panaderia", label: "Panadería", group: "Comida y bebida", query: "panadería", filters: ['node["shop"="bakery"]'] },
  { value: "pasteleria", label: "Pastelería", group: "Comida y bebida", query: "pastelería", filters: ['node["shop"="pastry"]', 'node["shop"="confectionery"]'] },
  { value: "carniceria", label: "Carnicería", group: "Comida y bebida", query: "carnicería", filters: ['node["shop"="butcher"]'] },
  { value: "marisqueria", label: "Pescadería / mariscos", group: "Comida y bebida", query: "pescadería", filters: ['node["shop"="seafood"]'] },
  { value: "licoreria", label: "Licorería", group: "Comida y bebida", query: "licorería", filters: ['node["shop"="alcohol"]'] },

  { value: "clinica", label: "Clínica", group: "Salud", query: "clínica", filters: ['node["amenity"="clinic"]'] },
  { value: "consultorio", label: "Consultorio médico", group: "Salud", query: "consultorio médico", filters: ['node["amenity"="doctors"]'] },
  { value: "dentist", label: "Dentista", group: "Salud", query: "dentista", filters: ['node["amenity"="dentist"]', 'way["amenity"="dentist"]', 'node["healthcare"="dentist"]', 'way["healthcare"="dentist"]'] },
  { value: "hospital", label: "Hospital", group: "Salud", query: "hospital", filters: ['node["amenity"="hospital"]'] },
  { value: "farmacia", label: "Farmacia", group: "Salud", query: "farmacia", filters: ['node["amenity"="pharmacy"]'] },
  { value: "veterinaria", label: "Veterinaria", group: "Salud", query: "veterinaria", filters: ['node["amenity"="veterinary"]'] },
  { value: "optica", label: "Óptica", group: "Salud", query: "óptica", filters: ['node["shop"="optician"]'] },
  { value: "laboratorio", label: "Laboratorio clínico", group: "Salud", query: "laboratorio clínico", filters: ['node["healthcare"="laboratory"]', 'node["amenity"="clinic"]'] },

  { value: "peluqueria", label: "Peluquería", group: "Belleza y deporte", query: "peluquería", filters: ['node["shop"="hairdresser"]'] },
  { value: "belleza", label: "Estética / belleza", group: "Belleza y deporte", query: "salón de belleza", filters: ['node["shop"="beauty"]'] },
  { value: "spa", label: "Spa / masajes", group: "Belleza y deporte", query: "spa", filters: ['node["shop"="massage"]', 'node["leisure"="spa"]'] },
  { value: "gym", label: "Gimnasio", group: "Belleza y deporte", query: "gimnasio", filters: ['node["leisure"="fitness_centre"]'] },
  { value: "deporte", label: "Centro deportivo", group: "Belleza y deporte", query: "centro deportivo", filters: ['node["leisure"="sports_centre"]'] },
  { value: "tatuajes", label: "Tatuajes", group: "Belleza y deporte", query: "tatuajes", filters: ['node["shop"="tattoo"]'] },

  { value: "abarrotes", label: "Abarrotes / minimarket", group: "Comercio", query: "minimarket", filters: ['node["shop"="convenience"]'] },
  { value: "supermercado", label: "Supermercado", group: "Comercio", query: "supermercado", filters: ['node["shop"="supermarket"]'] },
  { value: "ropa", label: "Ropa", group: "Comercio", query: "tienda de ropa", filters: ['node["shop"="clothes"]'] },
  { value: "zapatos", label: "Zapatería", group: "Comercio", query: "zapatería", filters: ['node["shop"="shoes"]'] },
  { value: "muebles", label: "Muebles", group: "Comercio", query: "muebles", filters: ['node["shop"="furniture"]'] },
  { value: "electronica", label: "Electrónica", group: "Comercio", query: "electrónica", filters: ['node["shop"="electronics"]'] },
  { value: "celular", label: "Celulares", group: "Comercio", query: "tienda de celulares", filters: ['node["shop"="mobile_phone"]'] },
  { value: "ferreteria", label: "Ferretería", group: "Comercio", query: "ferretería", filters: ['node["shop"="hardware"]', 'node["shop"="doityourself"]'] },
  { value: "floreria", label: "Florería", group: "Comercio", query: "florería", filters: ['node["shop"="florist"]'] },
  { value: "joyeria", label: "Joyería", group: "Comercio", query: "joyería", filters: ['node["shop"="jewelry"]'] },
  { value: "libreria", label: "Librería", group: "Comercio", query: "librería", filters: ['node["shop"="books"]'] },
  { value: "regalos", label: "Regalos", group: "Comercio", query: "tienda de regalos", filters: ['node["shop"="gift"]'] },
  { value: "mascotas", label: "Mascotas", group: "Comercio", query: "tienda de mascotas", filters: ['node["shop"="pet"]'] },
  { value: "papeleria", label: "Papelería", group: "Comercio", query: "papelería", filters: ['node["shop"="stationery"]'] },

  { value: "taller", label: "Taller mecánico", group: "Automotriz", query: "taller mecánico", filters: ['node["shop"="car_repair"]'] },
  { value: "repuestos", label: "Repuestos", group: "Automotriz", query: "repuestos de auto", filters: ['node["shop"="car_parts"]'] },
  { value: "lavado", label: "Lavado de autos", group: "Automotriz", query: "lavado de autos", filters: ['node["amenity"="car_wash"]'] },
  { value: "llantas", label: "Llantera", group: "Automotriz", query: "llantera", filters: ['node["shop"="tyres"]'] },
  { value: "concesionario", label: "Agencia de autos", group: "Automotriz", query: "agencia de autos", filters: ['node["shop"="car"]'] },

  { value: "abogado", label: "Abogado", group: "Servicios profesionales", query: "abogado", filters: ['node["office"="lawyer"]'] },
  { value: "contador", label: "Contador", group: "Servicios profesionales", query: "contador", filters: ['node["office"="accountant"]'] },
  { value: "inmobiliaria", label: "Inmobiliaria", group: "Servicios profesionales", query: "inmobiliaria", filters: ['node["office"="estate_agent"]'] },
  { value: "seguros", label: "Seguros", group: "Servicios profesionales", query: "agencia de seguros", filters: ['node["office"="insurance"]'] },
  { value: "arquitecto", label: "Arquitecto", group: "Servicios profesionales", query: "arquitecto", filters: ['node["office"="architect"]'] },
  { value: "notaria", label: "Notaría", group: "Servicios profesionales", query: "notaría", filters: ['node["office"="notary"]', 'node["office"="lawyer"]'] },
  { value: "publicidad", label: "Publicidad / marketing", group: "Servicios profesionales", query: "agencia de publicidad", filters: ['node["office"="advertising_agency"]', 'node["office"="graphic_design"]'] },
  { value: "copias", label: "Copias / imprenta", group: "Servicios profesionales", query: "imprenta", filters: ['node["shop"="copyshop"]'] },
  { value: "lavanderia", label: "Lavandería", group: "Servicios profesionales", query: "lavandería", filters: ['node["shop"="laundry"]', 'node["amenity"="laundry"]'] },
  { value: "viajes", label: "Agencia de viajes", group: "Servicios profesionales", query: "agencia de viajes", filters: ['node["shop"="travel_agency"]'] },

  { value: "hotel", label: "Hotel", group: "Hospedaje y turismo", query: "hotel", filters: ['node["tourism"="hotel"]'] },
  { value: "hostal", label: "Hostal / guest house", group: "Hospedaje y turismo", query: "hostal", filters: ['node["tourism"="guest_house"]'] },
  { value: "motel", label: "Motel", group: "Hospedaje y turismo", query: "motel", filters: ['node["tourism"="motel"]'] },
  { value: "apartamento", label: "Apartamentos turísticos", group: "Hospedaje y turismo", query: "apartamentos turísticos", filters: ['node["tourism"="apartment"]'] },

  { value: "escuela", label: "Escuela", group: "Educación y oficios", query: "escuela", filters: ['node["amenity"="school"]'] },
  { value: "guarderia", label: "Guardería", group: "Educación y oficios", query: "guardería", filters: ['node["amenity"="kindergarten"]'] },
  { value: "academia", label: "Academia / cursos", group: "Educación y oficios", query: "academia", filters: ['node["amenity"="language_school"]', 'node["office"="educational_institution"]'] },
  { value: "electricista", label: "Electricista", group: "Educación y oficios", query: "electricista", filters: ['node["craft"="electrician"]'] },
  { value: "plomeria", label: "Plomería", group: "Educación y oficios", query: "plomería", filters: ['node["craft"="plumber"]'] },
  { value: "carpinteria", label: "Carpintería", group: "Educación y oficios", query: "carpintería", filters: ['node["craft"="carpenter"]'] },
  { value: "construccion", label: "Constructora", group: "Educación y oficios", query: "constructora", filters: ['node["office"="construction_company"]', 'node["craft"="builder"]'] },
];

export function osmNicheByValue(value: string) {
  return OSM_NICHES.find((n) => n.value === value);
}

export function nicheSearchText(niche: string) {
  return osmNicheByValue(niche)?.query ?? niche;
}

export function osmFiltersForNiche(niche: string) {
  const exact = osmNicheByValue(niche);
  if (exact) return exact.filters;
  const folded = niche
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hit = OSM_NICHES.find(
    (n) =>
      folded.includes(
        n.value.replace(/_/g, " "),
      ) || folded.includes(n.query.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
  );
  if (hit) return hit.filters;
  const safe = niche.replace(/["\\[\]()~^$]/g, "").slice(0, 32).trim();
  if (!safe) return ['node["amenity"="restaurant"]'];
  return [`node["name"~"${safe}",i]`];
}
