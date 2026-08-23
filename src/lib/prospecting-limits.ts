export function hostedOnVercel() {
  return Boolean(process.env.VERCEL);
}

export function prospectingLimitMax() {
  return hostedOnVercel() ? 20 : 200;
}

export function clampProspectingLimit(n?: number) {
  const max = prospectingLimitMax();
  const fallback = hostedOnVercel() ? 12 : 80;
  return Math.min(Math.max(n ?? fallback, 5), max);
}
