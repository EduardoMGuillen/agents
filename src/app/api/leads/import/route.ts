import { NextResponse } from "next/server";
import { parseLeadsCsv } from "@/lib/csv";
import { importLeadRows } from "@/lib/import-leads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let csvText = "";
  let campaignName = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    campaignName = String(form.get("campaignName") || "");
    const file = form.get("file");
    const url = String(form.get("url") || "");
    if (file instanceof File) {
      csvText = await file.text();
    } else if (url.startsWith("https://") || url.startsWith("http://")) {
      const remote = await fetch(url, {
        headers: { "User-Agent": "NexusAtelier/1.0" },
      });
      if (!remote.ok) {
        return NextResponse.json(
          { error: "No pude descargar ese CSV" },
          { status: 400 },
        );
      }
      csvText = await remote.text();
    }
  } else {
    const body = (await req.json()) as { csv?: string; url?: string; campaignName?: string };
    campaignName = body.campaignName || "";
    if (body.csv) csvText = body.csv;
    else if (body.url) {
      const remote = await fetch(body.url, {
        headers: { "User-Agent": "NexusAtelier/1.0" },
      });
      if (!remote.ok) {
        return NextResponse.json(
          { error: "No pude descargar ese CSV" },
          { status: 400 },
        );
      }
      csvText = await remote.text();
    }
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Falta el archivo o el texto CSV" }, { status: 400 });
  }

  const rows = parseLeadsCsv(csvText).slice(0, 250);
  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "CSV vacío o sin columnas reconocidas. Usa company/empresa, email, website, city…",
      },
      { status: 400 },
    );
  }

  const result = await importLeadRows(
    rows,
    "csv_import",
    campaignName || `Import CSV ${new Date().toISOString().slice(0, 10)}`,
  );

  return NextResponse.json(result, { status: 201 });
}
