import type { Lead, LeadStatus } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const TWO_WEEKS_MS = 14 * DAY_MS;
const TWO_MONTHS_MS = 60 * DAY_MS;

function ageMs(lead: Lead) {
  const t = new Date(lead.updated_at).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
}

export function pipelineRetentionMs(status: LeadStatus) {
  if (status === "replied" || status === "qualified" || status === "handed_off") {
    return TWO_MONTHS_MS;
  }
  if (status === "won" || status === "lost") return TWO_MONTHS_MS;
  return TWO_WEEKS_MS;
}

export function isVisibleOnPipeline(lead: Lead) {
  if (lead.status === "lost") return false;
  return ageMs(lead) <= pipelineRetentionMs(lead.status);
}
