export type CampaignMeta = {
  kind?: string;
  leadIds?: string[];
  skipped?: number;
  scanned?: number;
  withWebsite?: number;
  withEmail?: number;
  limit?: number;
};

export function parseCampaignMeta(notes: string | null | undefined): CampaignMeta {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as CampaignMeta;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return {};
  }
  return {};
}

export function stringifyCampaignMeta(meta: CampaignMeta) {
  return JSON.stringify(meta);
}
