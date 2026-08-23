#!/usr/bin/env python3
"""Poll Nexus Office for Scrapling jobs (niche + city from the CRM).

  npm run scrape:worker

Uses GOOGLE_MAPS_API_KEY to find businesses, then Scrapling to extract public emails.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from scrape_import import (  # noqa: E402
    import_office,
    load_env_local,
    scrape_site,
    to_csv,
)

COUNTRY_NAMES = {
    "HN": "Honduras",
    "MX": "Mexico",
    "GT": "Guatemala",
    "SV": "El Salvador",
    "NI": "Nicaragua",
    "CR": "Costa Rica",
    "PA": "Panama",
    "US": "United States",
    "ES": "Spain",
    "CO": "Colombia",
    "AR": "Argentina",
    "CL": "Chile",
    "PE": "Peru",
    "BR": "Brazil",
}


def office_base() -> str:
    raw = os.getenv("NEXUS_OFFICE_WEBHOOK_URL", "").replace("/api/webhooks/form", "")
    return (
        raw
        or os.getenv("NEXT_PUBLIC_APP_URL")
        or "https://agents-office-beta.vercel.app"
    ).rstrip("/")


def headers() -> dict[str, str]:
    secret = os.getenv("SCRAPER_SECRET") or os.getenv("FORM_WEBHOOK_SECRET") or ""
    h = {"Content-Type": "application/json"}
    if secret:
        h["x-nexus-worker-secret"] = secret
    return h


def search_places(niche: str, city: str, country: str, limit: int) -> list[dict]:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Falta GOOGLE_MAPS_API_KEY en .env.local")
    label = COUNTRY_NAMES.get(country.upper(), country)
    queries = [f"{niche} en {city}, {label}"]
    for area in ("centro", "norte", "sur", "este", "oeste", "zona 1"):
        queries.append(f"{niche} en {city} {area}, {label}")
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "places.displayName,places.formattedAddress,places.websiteUri,"
            "places.nationalPhoneNumber,places.internationalPhoneNumber,"
            "places.businessStatus,places.userRatingCount,nextPageToken"
        ),
    }
    seen: set[str] = set()
    places: list[dict] = []
    cap = max(5, min(int(limit), 200))
    for query in queries:
        token = None
        for _ in range(8):
            payload = {
                "textQuery": query,
                "languageCode": "es",
                "maxResultCount": 20,
            }
            if token:
                payload["pageToken"] = token
            res = httpx.post(
                "https://places.googleapis.com/v1/places:searchText",
                headers=headers,
                json=payload,
                timeout=30,
            )
            res.raise_for_status()
            data = res.json()
            for raw in data.get("places") or []:
                if raw.get("businessStatus") and raw.get("businessStatus") != "OPERATIONAL":
                    continue
                name = ((raw.get("displayName") or {}).get("text") or "").strip()
                website = (raw.get("websiteUri") or "").strip()
                if not name or not website:
                    continue
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)
                places.append({"company": name, "website": website})
                if len(places) >= cap:
                    return places
            token = data.get("nextPageToken")
            if not token:
                break
            time.sleep(1.2)
    return places


def run_job(job: dict) -> dict:
    niche = job.get("niche") or "negocio local"
    city = job.get("city") or ""
    country = job.get("country") or "HN"
    try:
        meta = json.loads(job.get("notes") or "{}")
    except json.JSONDecodeError:
        meta = {}
    limit = max(5, min(int(meta.get("limit") or 80), 200))
    found_places = search_places(niche, city, country, limit)
    rows = []
    for i, place in enumerate(found_places):
        print(f"  [{i + 1}/{len(found_places)}] {place['website']}", flush=True)
        hit = scrape_site(place["website"])
        if hit:
            hit["company"] = place["company"] or hit["company"]
            print(f"    → {hit['email']}", flush=True)
            rows.append(hit)
        else:
            print("    → sin email público", flush=True)
        if i < len(found_places) - 1:
            time.sleep(1.5)
    return {
        "rows": rows,
        "scanned": len(found_places),
        "withEmail": len(rows),
        "niche": niche,
        "city": city,
        "country": country,
    }


def complete(base: str, job_id: str, ok: bool, extra: dict, error: str | None = None) -> None:
    httpx.post(
        f"{base}/api/scrape-jobs/{job_id}/complete",
        headers=headers(),
        json={
            "ok": ok,
            "notes": json.dumps(extra),
            "error": error,
        },
        timeout=30,
    )


def main() -> None:
    load_env_local()
    base = office_base()
    secret = os.getenv("SCRAPER_SECRET") or os.getenv("FORM_WEBHOOK_SECRET") or ""
    password = os.getenv("DASHBOARD_PASSWORD") or ""
    print(f"Worker Scrapling → {base}", flush=True)
    while True:
        try:
            res = httpx.get(f"{base}/api/scrape-jobs/next", headers=headers(), timeout=30)
            if res.status_code == 401:
                print("Auth falló. Pon SCRAPER_SECRET o FORM_WEBHOOK_SECRET.", flush=True)
                time.sleep(8)
                continue
            res.raise_for_status()
            job = (res.json() or {}).get("job")
        except Exception as e:
            print(f"Poll error: {e}", flush=True)
            time.sleep(8)
            continue

        if not job:
            time.sleep(4)
            continue

        print(f"Job {job.get('id')}: {job.get('name')}", flush=True)
        try:
            result = run_job(job)
            imported = {"leads": [], "skipped": 0}
            if result["rows"]:
                csv_text = to_csv(
                    result["rows"],
                    result["country"],
                    result["city"],
                    result["niche"],
                )
                imported = import_office(
                    base,
                    csv_text,
                    job.get("name") or "Scrapling",
                    secret,
                    password,
                )
            complete(
                base,
                job["id"],
                True,
                {
                    "kind": "scrapling",
                    "scanned": result["scanned"],
                    "withEmail": result["withEmail"],
                    "imported": len(imported.get("leads") or []),
                    "skipped": imported.get("skipped", 0),
                },
            )
            print(
                f"Listo: {result['withEmail']} emails / {result['scanned']} webs · "
                f"importados {len(imported.get('leads') or [])}",
                flush=True,
            )
        except Exception as e:
            print(f"Job falló: {e}", flush=True)
            complete(base, job["id"], False, {"kind": "scrapling"}, str(e))


if __name__ == "__main__":
    main()
