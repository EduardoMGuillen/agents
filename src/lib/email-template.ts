const SITE = "https://www.nexusglobalsuministros.com/";
const IG = "https://www.instagram.com/nexusglobalhn/";
const PHONE = "+504 9882-3627";
const PHONE_TEL = "+50498823627";
const TEAL = "#00BAC4";
const NAVY = "#102865";
const INK = "#102865";
const MUTED = "#5B6472";
const LINE = "#E2E8F0";
const FONT = "Inter,Arial,Helvetica,sans-serif";

export function emailAssetOrigin() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "https://agents-office-beta.vercel.app";
}

export function logoUrl() {
  return `${emailAssetOrigin()}/nexus-logo.png`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function linkify(escaped: string) {
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${TEAL};text-decoration:underline;">$1</a>`,
  );
}

function bodyToHtml(body: string) {
  const cleaned = body
    .replace(/\r\n/g, "\n")
    .replace(/\n*(Eduardo\nNexus Global|— Nexus Sales)\s*$/i, "")
    .trim();
  return cleaned
    .split(/\n{2,}/)
    .map((block) => {
      const lines = linkify(escapeHtml(block.trim())).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:${INK};">${lines}</p>`;
    })
    .join("");
}

export function renderEmailHtml(
  body: string,
  options?: { locale?: "es" | "en"; previewLogo?: string },
) {
  const en = options?.locale === "en";
  const logo = options?.previewLogo || logoUrl();
  const kicker = en ? "Web · Digital solutions" : "Desarrollo web · Soluciones digitales";
  const tagline = en ? "Websites that bring clients" : "Webs que sí traen clientes";
  const cta = en ? "See our work" : "Ver nuestro trabajo";
  const preheader = en
    ? "A note from Nexus Global — websites that bring clients."
    : "Un mensaje de Nexus Global — webs que sí traen clientes.";

  return `<!DOCTYPE html>
<html lang="${en ? "en" : "es"}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light only"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>Nexus Global</title>
</head>
<body style="margin:0;padding:0;background:transparent;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:transparent;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" style="background:#ffffff;padding:28px 28px 18px 28px;">
              <img src="${logo}" alt="Nexus" width="168" style="display:block;border:0;width:168px;height:auto;max-width:168px;margin:0 auto;"/>
              <p style="margin:14px 0 0 0;font-family:${FONT};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${TEAL};font-weight:600;">${kicker}</p>
              <p style="margin:6px 0 0 0;font-family:${FONT};font-size:13px;color:${MUTED};">${tagline}</p>
            </td>
          </tr>
          <tr>
            <td style="height:3px;line-height:3px;font-size:0;background:${TEAL};">&nbsp;</td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px 32px 8px 32px;font-family:${FONT};">
              ${bodyToHtml(body)}
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:8px 32px 28px 32px;font-family:${FONT};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-top:20px;border-top:1px solid ${LINE};">
                    <p style="margin:0 0 2px 0;font-size:15px;font-weight:700;color:${NAVY};">Eduardo</p>
                    <p style="margin:0 0 18px 0;font-size:13px;color:${MUTED};">Nexus Global</p>
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" bgcolor="${TEAL}" style="background:${TEAL};border-radius:999px;">
                          <a href="${SITE}" style="display:inline-block;background:${TEAL};color:${NAVY};text-decoration:none;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.01em;padding:12px 22px;border-radius:999px;">${cta}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:0 32px 28px 32px;font-family:${FONT};font-size:13px;line-height:1.8;color:${INK};">
              <p style="margin:0 0 4px 0;">
                <a href="tel:${PHONE_TEL}" style="color:${INK};text-decoration:none;">☎ ${PHONE}</a>
              </p>
              <p style="margin:0 0 4px 0;">
                <a href="${IG}" style="color:${INK};text-decoration:none;">📷 Nexusglobalhn</a>
              </p>
              <p style="margin:0 0 4px 0;">
                <a href="${SITE}" style="color:${TEAL};text-decoration:none;">🌐 www.nexusglobalsuministros.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
