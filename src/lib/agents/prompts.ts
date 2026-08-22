import type { Lead } from "@/lib/types";
import { countryName } from "@/lib/locale";

export const NEXUS_SITE = "https://www.nexusglobalsuministros.com/";

export const SALES_SYSTEM_ES = `Eres el Sales Agent de Nexus Global (nexusglobalsuministros.com).
Nexus vende páginas web a negocios locales pequeños y medianos (no cadenas ni corporativos).
El desarrollador humano (Eduardo) construye los sitios; tú calificas y calientas leads.
Reglas:
- Habla en español profesional, cercano y concreto.
- Tono para dueño de negocio local, no para enterprise.
- No inventes precios fijos; menciona que Eduardo cotiza según alcance.
- Incluye siempre el link ${NEXUS_SITE} cuando invites a ver trabajo/proceso.
- Sé transparente: eres el asistente de ventas de Nexus.
- Pregunta para calificar: ¿tienen web hoy?, ¿qué necesitan?, ¿plazo?, ¿presupuesto aproximado?
- Si el lead quiere llamada/cotización seria, indícalo claramente en readyForHandoff=true.
- Responde SOLO JSON válido.`;

export const SALES_SYSTEM_EN = `You are the Sales Agent for Nexus Global (nexusglobalsuministros.com).
Nexus builds websites for small and mid-size local businesses (not big chains or corporates).
A human developer (Eduardo) builds the sites; you qualify and warm leads.
Rules:
- Professional, concise English.
- Tone for a local owner, not enterprise procurement.
- Do not invent fixed prices; Eduardo quotes by scope.
- Include ${NEXUS_SITE} when inviting them to see work/process.
- Be transparent: you are Nexus sales assistant.
- Qualify: current website?, need?, timeline?, rough budget?
- If they want a serious call/quote, set readyForHandoff=true.
- Respond ONLY with valid JSON.`;

function angleEs(lead: Lead, company: string, where: string) {
  const niche = (lead.niche || "").toLowerCase();
  const hasWeb = Boolean(lead.website);
  if (/restaurant|comida|bistro|cafe|bar|pinata|fiesta/.test(niche)) {
    return hasWeb
      ? `Hoy mucha gente busca dónde comer o encargar antes de salir. Si la web de ${company} no se ve clara en el celular, se van con el de al lado.`
      : `Hoy la gente busca en Google o WhatsApp dónde comer o encargar. Si ${company} no aparece bien, se van con el de al lado.`;
  }
  if (/belleza|salon|estetica/.test(niche)) {
    return `En belleza la primera impresión es la foto y lo fácil que sea agendar. Una web simple ayuda a que ${company} se vea tan profesional como el servicio.`;
  }
  if (/salud|clinic|dental|oftal|rehabil/.test(niche)) {
    return `Quien busca un consultorio quiere confianza: ubicación, servicios y cómo contactarlos. Eso se resuelve con una web clara.`;
  }
  if (/auto|taller|bateria|repara/.test(niche)) {
    return `Cuando el carro falla, buscan el taller más cercano que inspire confianza. ${company} gana si aparece con teléfono, horario y lo que reparan.`;
  }
  if (/ropa|calzado|tienda|comercio|abarro/.test(niche)) {
    return `Aunque vendan en local, muchos clientes los buscan en internet antes de ir. Una vitrina de ${company} ayuda a no perderse frente al que sí se ve online.`;
  }
  if (/legal|abogad|profesional|contab/.test(niche)) {
    return `En servicios profesionales la web es la tarjeta de presentación: quiénes son, qué atienden y cómo escribirles.`;
  }
  if (/educa|escuela|academia/.test(niche)) {
    return `Los papás comparan escuelas y academias en el teléfono. ${company} se ve más serio con una página de programas, ubicación y contacto.`;
  }
  return hasWeb
    ? `Revisé ${company}${where ? ` en ${where}` : ""} y vi que ya tienen presencia online. A veces con un ajuste se entiende mejor lo que hacen.`
    : `Revisé ${company}${where ? ` en ${where}` : ""}. Negocios como el suyo suelen perder clientes solo porque no se encuentran fácil en internet.`;
}

export function salesDraftFallback(lead: Lead) {
  const company = lead.company || "tu negocio";
  const where = [lead.city, countryName(lead.country)].filter(Boolean).join(", ");

  if (lead.locale === "en") {
    const place = where ? ` in ${where}` : "";
    return {
      subject: `${company} — a simple website that brings you clients`,
      body: `Hi,

I'm Eduardo, from Nexus Global. We build websites for small and mid-size local businesses.

I came across ${company}${place}${lead.niche ? ` (${lead.niche})` : ""}. ${
        lead.website
          ? `You already have a site; it may just need to be clearer so people can contact you without hunting.`
          : `A lot of nearby customers search on their phone first. If they can't find you, they call someone else.`
      }

If it's useful, I can send a short idea of what your site could look like — no price until we know the scope.

A bit of our work: ${NEXUS_SITE}

If you'd rather not hear from me, say so and I won't write again.

Eduardo
Nexus Global`,
      score: 0,
      readyForHandoff: false,
      qualificationNotes: "Primer contacto natural (EN)",
    };
  }

  return {
    subject: `${company}: una web sencilla para que te encuentren`,
    body: `Hola,

Soy Eduardo, de Nexus Global. Hacemos páginas web para negocios locales, sin paquetes inflados.

${angleEs(lead, company, where)}

Si te interesa, te mando una idea corta de cómo se vería el sitio de ${company}. El precio lo vemos después, según lo que necesites.

Un poco de lo que hacemos: ${NEXUS_SITE}

Si no aplica, dime y no te vuelvo a escribir.

Eduardo
Nexus Global`,
    score: 0,
    readyForHandoff: false,
    qualificationNotes: "Primer contacto natural (ES)",
  };
}

export function salesReplyFallback(lead: Lead, inbound: string) {
  const lower = inbound.toLowerCase();
  const wantsCall =
    /llamada|call|zoom|meet|cotiz|precio|budget|quote|quiero|interested|interes/.test(
      lower,
    );

  if (lead.locale === "en") {
    return {
      subject: `Re: ${lead.company || "your project"}`,
      body: `Thanks for your reply.

To prepare a useful quote with Eduardo, could you share:
- Goal of the site
- Timeline
- Approximate budget

Site: ${NEXUS_SITE}

${wantsCall ? "I'll flag Eduardo so he can schedule a call with you." : "Whenever you're ready for a call, say the word."}

— Nexus Sales`,
      score: wantsCall ? 75 : 55,
      readyForHandoff: wantsCall,
      qualificationNotes: wantsCall
        ? "Lead shows buying intent"
        : "Continue qualifying",
    };
  }

  return {
    subject: `Re: ${lead.company || "tu proyecto"}`,
    body: `Gracias por responder.

Para preparar una cotización útil con Eduardo, ¿me compartes:
- Objetivo del sitio
- Plazo
- Presupuesto aproximado

Web: ${NEXUS_SITE}

${wantsCall ? "Voy a avisar a Eduardo para que agende una llamada contigo." : "Cuando quieras una llamada, dímelo y te conecto."}

— Nexus Sales`,
    score: wantsCall ? 75 : 55,
    readyForHandoff: wantsCall,
    qualificationNotes: wantsCall
      ? "Lead muestra intención de compra"
      : "Seguir calificando",
  };
}
