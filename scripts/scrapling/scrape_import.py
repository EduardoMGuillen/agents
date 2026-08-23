#!/usr/bin/env python3
"""Scrape public pages with Scrapling and import leads into Nexus Office.

Only public HTML. Skips rows without a real email.

  pip install -r scripts/scrapling/requirements.txt
  pip install "scrapling[fetchers]"   # if Fetcher import fails
  scrapling install                   # only if you need a real browser

  python scripts/scrapling/scrape_import.py --url https://example.com/contacto
  python scripts/scrapling/scrape_import.py --sites-file sites.txt --country HN --city Tegucigalpa --niche restaurante
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

SKIP_EMAIL = re.compile(
    r"(noreply|no-reply|donotreply|privacy|legal|example\.com|sentry|wixpress|cloudflare|schema\.org|protected)",
    re.I,
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PREFERRED = re.compile(r"^(hola|info|contacto|contact|ventas|sales|hello|admin|oficina)@", re.I)
SKIP_HOST = re.compile(
    r"(google|facebook|instagram|youtube|tiktok|whatsapp|linktr\.ee|bit\.ly)",
    re.I,
)


def load_env_local() -> None:
    root = Path(__file__).resolve().parents[2]
    env = root / ".env.local"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


def valid_email(value: str | None) -> str | None:
    email = (value or "").strip().lower()
    if not email or SKIP_EMAIL.search(email):
        return None
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return None
    return email


def rank_email(email: str, domain: str | None) -> int:
    score = 10
    if PREFERRED.search(email):
        score += 40
    if domain and email.endswith(f"@{domain}"):
        score += 30
    return score


def pick_email(html: str, page_url: str) -> str | None:
    host = urlparse(page_url).hostname or ""
    domain = host.replace("www.", "").lower()
    found = {m.group(0).lower() for m in EMAIL_RE.finditer(html)}
    mailtos = {
        m.group(1).lower()
        for m in re.finditer(r"mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})", html, re.I)
    }
    emails = [e for e in found | mailtos if valid_email(e)]
    emails.sort(key=lambda e: rank_email(e, domain), reverse=True)
    return emails[0] if emails else None


def pick_company(html: str, page_url: str) -> str:
    patterns = [
        r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:site_name["\']',
        r"<h1[^>]*>(.*?)</h1>",
        r"<title>(.*?)</title>",
    ]
    for pat in patterns:
        m = re.search(pat, html, re.I | re.S)
        if m:
            text = re.sub(r"<[^>]+>", "", m.group(1))
            text = re.sub(r"\s+", " ", text).strip()
            if 2 < len(text) < 80:
                return text.split("|")[0].split("–")[0].strip()
    host = (urlparse(page_url).hostname or "negocio").replace("www.", "")
    return host.split(".")[0].replace("-", " ").title()


def fetch_html(url: str) -> str | None:
    try:
        from scrapling.fetchers import Fetcher

        page = Fetcher.get(url, stealthy_headers=True)
        html = getattr(page, "html_content", None) or getattr(page, "body", None) or str(page)
        return html if html and "<" in html else None
    except Exception:
        pass

    try:
        from scrapling.parser import Selector
        import urllib.request

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "NexusOffice/1.0 (+https://www.nexusglobalsuministros.com/) public contact lookup",
                "Accept": "text/html",
            },
        )
        with urllib.request.urlopen(req, timeout=12) as res:
            raw = res.read(400_000)
        html = raw.decode("utf-8", errors="ignore")
        _ = Selector(html)
        return html
    except Exception:
        return None


def contact_urls(website: str) -> list[str]:
    try:
        parsed = urlparse(website)
        if not parsed.scheme:
            website = "https://" + website
            parsed = urlparse(website)
        if SKIP_HOST.search(parsed.netloc or ""):
            return []
        origin = f"{parsed.scheme}://{parsed.netloc}"
        return [
            website,
            urljoin(origin + "/", "contacto"),
            urljoin(origin + "/", "contact"),
            urljoin(origin + "/", "contactenos"),
        ]
    except Exception:
        return []


def scrape_site(url: str) -> dict | None:
    html = None
    used = url
    for candidate in contact_urls(url)[:3] or [url]:
        html = fetch_html(candidate)
        if not html:
            continue
        used = candidate
        email = pick_email(html, candidate)
        if email:
            return {
                "company": pick_company(html, candidate),
                "email": email,
                "website": url,
            }
    if html:
        email = pick_email(html, used)
        if email:
            return {
                "company": pick_company(html, used),
                "email": email,
                "website": url,
            }
    return None


def to_csv(rows: list[dict], country: str, city: str, niche: str) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=["nombre_empresa", "email", "pais", "sector", "city", "website"],
    )
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                "nombre_empresa": row["company"],
                "email": row["email"],
                "pais": country,
                "sector": niche,
                "city": city,
                "website": row.get("website") or "",
            }
        )
    return buf.getvalue()


def import_office(base: str, csv_text: str, campaign: str, secret: str, password: str) -> dict:
    if httpx is None:
        raise SystemExit("Instala httpx: pip install httpx")
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["x-nexus-worker-secret"] = secret
        res = httpx.post(
            f"{base.rstrip('/')}/api/leads/import",
            headers=headers,
            json={"csv": csv_text, "campaignName": campaign},
            timeout=60,
        )
        res.raise_for_status()
        return res.json()

    session = httpx.Client(timeout=60)
    login = session.post(
        f"{base.rstrip('/')}/api/auth/login",
        json={"password": password},
    )
    if login.status_code >= 400:
        raise SystemExit(f"Login falló: {login.status_code} {login.text}")
    res = session.post(
        f"{base.rstrip('/')}/api/leads/import",
        json={"csv": csv_text, "campaignName": campaign},
    )
    res.raise_for_status()
    return res.json()


def main() -> None:
    load_env_local()
    parser = argparse.ArgumentParser(description="Scrapling → Nexus Office")
    parser.add_argument("--url", help="Una página o web de negocio")
    parser.add_argument("--sites-file", help="Archivo con una URL por línea")
    parser.add_argument("--office", default=os.getenv("NEXUS_OFFICE_WEBHOOK_URL", "").replace("/api/webhooks/form", "") or "http://localhost:3000")
    parser.add_argument("--country", default="HN")
    parser.add_argument("--city", default="")
    parser.add_argument("--niche", default="negocio local")
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    urls: list[str] = []
    if args.url:
        urls.append(args.url.strip())
    if args.sites_file:
        urls.extend(
            line.strip()
            for line in Path(args.sites_file).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        )
    urls = list(dict.fromkeys(urls))
    if not urls:
        parser.error("Pasa --url o --sites-file")

    found: list[dict] = []
    for i, url in enumerate(urls):
        if not url.startswith("http"):
            url = "https://" + url
        print(f"[{i + 1}/{len(urls)}] {url}", flush=True)
        row = scrape_site(url)
        if row:
            print(f"  → {row['company']} <{row['email']}>", flush=True)
            found.append(row)
        else:
            print("  → sin email público", flush=True)
        if i < len(urls) - 1:
            time.sleep(max(0.5, args.delay))

    print(f"Con email: {len(found)} / {len(urls)}")
    if not found:
        sys.exit(0)

    csv_text = to_csv(found, args.country, args.city, args.niche)
    if args.dry_run:
        print(csv_text)
        return

    secret = os.getenv("SCRAPER_SECRET") or os.getenv("FORM_WEBHOOK_SECRET") or ""
    password = os.getenv("DASHBOARD_PASSWORD") or ""
    result = import_office(args.office, csv_text, f"Scrapling {args.niche}", secret, password)
    created = result.get("leads") or []
    print(f"Importados: {len(created)} · omitidos: {result.get('skipped', 0)}")


if __name__ == "__main__":
    main()
