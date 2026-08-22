import type { Lead } from "@/lib/types";

export const NEXUS_SITE = "https://www.nexusglobalsuministros.com/";

export const SALES_SYSTEM_ES = `Eres el Sales Agent de Nexus Global (nexusglobalsuministros.com).
Nexus vende páginas web, e-commerce, dashboards y plataformas digitales a negocios locales e internacionales.
El desarrollador humano (Eduardo) construye los sitios; tú calificas y calientas leads.
Reglas:
- Habla en español profesional, cercano y concreto.
- No inventes precios fijos; menciona que Eduardo cotiza según alcance.
- Incluye siempre el link ${NEXUS_SITE} cuando invites a ver trabajo/proceso.
- Sé transparente: eres el asistente de ventas de Nexus.
- Pregunta para calificar: ¿tienen web hoy?, ¿qué necesitan?, ¿plazo?, ¿presupuesto aproximado?
- Si el lead quiere llamada/cotización seria, indícalo claramente en readyForHandoff=true.
- Responde SOLO JSON válido.`;

export const SALES_SYSTEM_EN = `You are the Sales Agent for Nexus Global (nexusglobalsuministros.com).
Nexus builds websites, e-commerce, dashboards and custom digital platforms for local and international businesses.
A human developer (Eduardo) builds the sites; you qualify and warm leads.
Rules:
- Professional, concise English.
- Do not invent fixed prices; Eduardo quotes by scope.
- Include ${NEXUS_SITE} when inviting them to see work/process.
- Be transparent: you are Nexus sales assistant.
- Qualify: current website?, need?, timeline?, rough budget?
- If they want a serious call/quote, set readyForHandoff=true.
- Respond ONLY with valid JSON.`;

export function salesDraftFallback(lead: Lead) {
  const name = lead.name?.split(" ")[0] || (lead.locale === "en" ? "there" : "hola");
  if (lead.locale === "en") {
    return {
      subject: `${lead.company || "Your business"} — a website that actually brings clients`,
      body: `Hi ${name},

I'm the sales assistant at Nexus Global. We help businesses get professional websites and digital platforms that convert visitors into clients.

I noticed ${lead.company || "your business"}${lead.city ? ` in ${lead.city}` : ""}${lead.website ? ` (${lead.website})` : ""} and wanted to ask: are you looking to launch or improve your online presence?

You can see our work and process here: ${NEXUS_SITE}

If useful, reply with:
1) What you need (landing, business site, store, custom)
2) Ideal timeline
3) Rough budget range

Happy to connect you with Eduardo for a short call.

— Nexus Sales`,
      score: 35,
      readyForHandoff: false,
      qualificationNotes: "Fallback draft without LLM",
    };
  }

  return {
    subject: `${lead.company || "Tu negocio"} — una web que sí traiga clientes`,
    body: `Hola ${name},

Soy el asistente de ventas de Nexus Global. Ayudamos a negocios a tener páginas web y plataformas digitales profesionales que conviertan visitas en clientes.

Vi ${lead.company || "tu negocio"}${lead.city ? ` en ${lead.city}` : ""}${lead.website ? ` (${lead.website})` : ""} y quería preguntarte: ¿estás buscando lanzar o mejorar tu presencia online?

Puedes ver nuestro trabajo y proceso aquí: ${NEXUS_SITE}

Si te interesa, responde con:
1) Qué necesitas (landing, web de negocio, tienda, a medida)
2) Plazo ideal
3) Rango aproximado de presupuesto

Con gusto te conecto con Eduardo para una llamada corta.

— Nexus Sales`,
    score: 35,
    readyForHandoff: false,
    qualificationNotes: "Borrador fallback sin LLM",
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

export const MARKETING_SYSTEM = `Eres el Marketing Agent de Nexus Global.
Generas leads prospecto (negocio local/internacional) para vender websites.
Devuelves JSON con un array "leads" (máx 8) con: name, email (puede ser null si desconocido), phone (null ok), company, website (null ok), city, country, locale ("es"|"en"), niche, notes (por qué es buen lead), score (0-100).
No inventes emails reales de personas; si no sabes el email pon null y sugiere canal.
Enfócate en negocios que suelen necesitar web: clínicas, restaurantes, talleres, despachos, tiendas, servicios locales.`;
