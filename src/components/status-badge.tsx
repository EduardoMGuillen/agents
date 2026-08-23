import { STATUS_LABELS, type LeadStatus } from "@/lib/types";

const COLORS: Record<LeadStatus, string> = {
  new: "badge-accent",
  contacted: "badge",
  replied: "badge-warn",
  qualified: "badge-ok",
  handed_off: "badge-ok",
  won: "badge-ok",
  lost: "badge",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`badge ${COLORS[status]}`}>{STATUS_LABELS[status]}</span>
  );
}

export function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 70 ? "badge-ok" : score >= 40 ? "badge-warn" : "badge";
  return <span className={`badge ${tone}`}>IA {score}</span>;
}
