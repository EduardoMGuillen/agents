const SITE = "https://www.nexusglobalsuministros.com/";
const GREEN = "#16a34a";
const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const BG = "#f3f4f6";

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
  return `${emailAssetOrigin()}/NexusGPTHD.png`;
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
    `<a href="$1" style="color:${GREEN};text-decoration:underline;">$1</a>`,
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
      return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:${INK};">${lines}</p>`;
    })
    .join("");
}

export function renderEmailHtml(
  body: string,
  options?: { locale?: "es" | "en"; previewLogo?: string },
) {
  const en = options?.locale === "en";
  const logo = options?.previewLogo || logoUrl();
  const footer = en
    ? "Websites for local businesses · Nexus Global"
    : "Páginas web para negocios locales · Nexus Global";

  return `<!DOCTYPE html>
<html lang="${en ? "en" : "es"}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Nexus Global</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${LINE};">
          <tr>
            <td style="background:${INK};padding:20px 28px;border-bottom:3px solid ${GREEN};">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${logo}" alt="Nexus Global" width="40" height="40" style="display:block;border:0;width:40px;height:40px;"/>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Nexus Global</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;">${en ? "Websites that bring clients" : "Webs que sí traen clientes"}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
              ${bodyToHtml(body)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-top:8px;border-top:1px solid ${LINE};">
                    <p style="margin:16px 0 4px 0;font-size:14px;font-weight:700;color:${INK};">Eduardo</p>
                    <p style="margin:0 0 12px 0;font-size:13px;color:${MUTED};">Nexus Global</p>
                    <a href="${SITE}" style="display:inline-block;background:${GREEN};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 16px;">${en ? "See our work" : "Ver nuestro trabajo"}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px;background:${BG};border-top:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};">
              ${footer}<br/>
              <a href="${SITE}" style="color:${GREEN};text-decoration:none;">nexusglobalsuministros.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
