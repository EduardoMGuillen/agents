import type { Lead } from "@/lib/types";
import { countryName } from "@/lib/locale";

export const NEXUS_SITE = "https://www.nexusglobalsuministros.com/";

export function leadHasWebsite(lead: Lead) {
  const w = (lead.website || "").trim().toLowerCase();
  if (!w) return false;
  return !/(facebook|instagram|tiktok|whatsapp|wa\.me|linktr\.ee|maps\.google)/i.test(
    w,
  );
}

export const SALES_SYSTEM_ES = `Eres el Sales Agent de Nexus Global (nexusglobalsuministros.com).
Nexus vende páginas web a negocios locales pequeños y medianos (no cadenas ni corporativos).
El desarrollador humano (Eduardo) construye los sitios; tú calificas y calientas leads.
Reglas:
- Habla en español profesional, cercano y concreto.
- Tono para dueño de negocio local, no para enterprise.
- No inventes precios fijos; menciona que Eduardo cotiza según alcance.
- Incluye siempre el link ${NEXUS_SITE} cuando invites a ver trabajo/proceso.
- Sé transparente: eres el asistente de ventas de Nexus.
- Primer contacto: corto, una observación y UNA pregunta sí/no.
- Si el lead NO tiene web (o solo Facebook/Instagram), el ángulo es primera presencia: que los encuentren en Google, no rediseño.
- Si SÍ tiene web, el ángulo es claridad y contacto, no “hacerla de cero”.
- Ofrece 2 ideas concretas, sin precio. No pidas presupuesto en el primer mail.
- En el primer contacto ofrece una demo gratuita sin compromiso (una muestra de cómo se vería su web). No es el pie del mail: va en el cuerpo, como la invitación.
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
- First touch: short, one observation, ONE yes/no question.
- If they have NO website (or only social), pitch a first simple site. Do not talk about a redesign.
- If they HAVE a website, pitch clarity and easier contact, not starting from scratch.
- Offer 2 concrete ideas, no price. Do not ask for budget in the first email.
- First touch must offer a free demo with no commitment (a sample of how their site could look). Put it in the body, not as a footer slogan.
- If they want a serious call/quote, set readyForHandoff=true.
- Respond ONLY with valid JSON.`;

function angleEs(lead: Lead, company: string, where: string) {
  const niche = (lead.niche || "").toLowerCase();
  const hasWeb = leadHasWebsite(lead);
  const loc = where ? ` en ${where}` : "";

  if (/restaurant|comida|bistro|cafe|bar|pinata|fiesta/.test(niche)) {
    return hasWeb
      ? `Vi que ${company}${loc} ya tiene web. En comida, si no se entiende el menú, el horario y cómo pedir en el celular, la gente se va con el de al lado.`
      : `Busqué a ${company}${loc} y no vi una web propia. Hoy mucha gente elige dónde comer desde el teléfono; si no aparecen, se van con el de al lado.`;
  }
  if (/belleza|salon|estetica/.test(niche)) {
    return hasWeb
      ? `Vi la web de ${company}. En belleza cuenta que las fotos y el agendar se vean fáciles, no escondidos.`
      : `${company}${loc} no tiene una página propia. En belleza la gente compara fotos y horarios en el teléfono antes de escribir.`;
  }
  if (/salud|clinic|dental|oftal|rehabil/.test(niche)) {
    return hasWeb
      ? `Revisé el sitio de ${company}. Quien busca consultorio quiere ver de una vez servicios, ubicación y cómo contactarlos.`
      : `No encontré web de ${company}${loc}. Quien busca un consultorio suele googlear primero: si no hay página, eligen al que sí se ve.`;
  }
  if (/auto|taller|bateria|repara/.test(niche)) {
    return hasWeb
      ? `Vi que ${company} ya tiene sitio. Cuando el carro falla, gana el taller que muestra teléfono, horario y qué reparan, sin dar vueltas.`
      : `${company}${loc} no aparece con una web propia. Cuando el carro falla, llaman al primero que encuentren con teléfono y horario claros.`;
  }
  if (/ropa|calzado|tienda|comercio|abarro/.test(niche)) {
    return hasWeb
      ? `Vi la web de ${company}. Aunque vendan en local, si la vitrina online no se entiende, se pierden ventas frente al que sí se ve.`
      : `${company}${loc} no tiene vitrina web. Aunque vendan en local, muchos clientes buscan en internet antes de ir.`;
  }
  if (/legal|abogad|profesional|contab/.test(niche)) {
    return hasWeb
      ? `Vi el sitio de ${company}. En servicios profesionales la web es la tarjeta: quiénes son, qué atienden y cómo escribirles, sin ruido.`
      : `No vi web de ${company}${loc}. En servicios profesionales, sin una página, muchos asumen que el despacho no está activo.`;
  }
  if (/educa|escuela|academia/.test(niche)) {
    return hasWeb
      ? `Revisé la web de ${company}. Los papás comparan programas y contacto en el teléfono; si cuesta encontrarlos, se van.`
      : `${company}${loc} no tiene página propia. Los papás comparan escuelas en el teléfono; el que no aparece, no entra a la lista.`;
  }
  return hasWeb
    ? `Vi que ${company}${loc} ya tiene presencia online. A veces con una web más clara (qué hacen y cómo contactarlos) se dejan de perder clientes.`
    : `Busqué a ${company}${loc} y no vi una web propia. Negocios como el suyo suelen perder clientes solo porque no se encuentran fácil en internet.`;
}

export function salesDraftFallback(lead: Lead) {
  const company = lead.company || "tu negocio";
  const where = [lead.city, countryName(lead.country)].filter(Boolean).join(", ");
  const hasWeb = leadHasWebsite(lead);

  if (lead.locale === "en") {
    const place = where ? ` in ${where}` : "";
    if (!hasWeb) {
      return {
        subject: `${company}: I looked you up on Google`,
        body: `Hi,

I'm Eduardo (Nexus). I build simple websites for local businesses.

I searched for ${company}${place} and didn't find a site of your own. People nearby look on their phone first — if they can't find you, they call the next place.

I can send a free demo of a first page (who you are, what you do, how to reach you). No commitment and no price yet.

Work: ${NEXUS_SITE}

Want me to send the free demo?

Eduardo
Nexus Global`,
        score: 0,
        readyForHandoff: false,
        qualificationNotes: "Primer contacto sin web (EN)",
      };
    }
    return {
      subject: `${company}: 2 ideas for your website`,
      body: `Hi,

I'm Eduardo (Nexus). I build websites for local businesses.

I opened the ${company}${place} site. The business is there — on a phone it's often hard to see what you do and how to contact you. That's where clients drop off.

I can send a free demo with 2 concrete ideas to make that page bring more messages. No commitment; no price until we know the scope.

Work: ${NEXUS_SITE}

Want me to send the free demo?

Eduardo
Nexus Global`,
      score: 0,
      readyForHandoff: false,
      qualificationNotes: "Primer contacto con web (EN)",
    };
  }

  if (!hasWeb) {
    return {
      subject: `${company}: te busqué en Google`,
      body: `Hola,

Soy Eduardo (Nexus). Hago webs para negocios locales.

${angleEs(lead, company, where)}

Te puedo mandar una demo gratis de una primera página para ${company} (quiénes son, qué hacen, cómo contactarlos). Sin compromiso y sin precio todavía.

Lo que hacemos: ${NEXUS_SITE}

¿Te mando la demo?

Eduardo
Nexus Global`,
      score: 0,
      readyForHandoff: false,
      qualificationNotes: "Primer contacto sin web (ES)",
    };
  }

  return {
    subject: `${company}: 2 ideas para tu web`,
    body: `Hola,

Soy Eduardo (Nexus). Hago webs para negocios locales.

${angleEs(lead, company, where)}

Te puedo mandar una demo gratis con 2 ideas concretas para que esa página traiga más mensajes. Sin compromiso; el precio se ve después, según alcance.

Lo que hacemos: ${NEXUS_SITE}

¿Te mando la demo?

Eduardo
Nexus Global`,
    score: 0,
    readyForHandoff: false,
    qualificationNotes: "Primer contacto con web (ES)",
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
