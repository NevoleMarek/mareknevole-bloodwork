export const PERIODS = ["1M", "6M", "1Y", "ALL"] as const;

export type Period = (typeof PERIODS)[number];

export function isPeriod(value: string | null): value is Period {
  return value === "1M" || value === "6M" || value === "1Y" || value === "ALL";
}

const months = {
  "1M": 1,
  "6M": 6,
  "1Y": 12,
  ALL: null,
} satisfies Record<Period, number | null>;

export function getCutoffDate(period: Exclude<Period, "ALL">): string;
export function getCutoffDate(period: "ALL"): null;
export function getCutoffDate(period: Period): string | null;
export function getCutoffDate(period: Period): string | null {
  const m = months[period];
  if (m === null) return null;
  const now = new Date();
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, now.getUTCDate()),
  );
  return cutoff.toISOString().slice(0, 10);
}
