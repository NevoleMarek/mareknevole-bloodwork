export type Period = "1M" | "6M" | "1Y" | "ALL";

export const PERIODS: Period[] = ["1M", "6M", "1Y", "ALL"];

export function isPeriod(value: unknown): value is Period {
  return PERIODS.includes(value as Period);
}

export function getCutoffDate(period: Exclude<Period, "ALL">): string;
export function getCutoffDate(period: "ALL"): null;
export function getCutoffDate(period: Period): string | null;
export function getCutoffDate(period: Period): string | null {
  const months: Record<Period, number | null> = {
    "1M": 1,
    "6M": 6,
    "1Y": 12,
    ALL: null,
  };
  const m = months[period];
  if (m === null) return null;
  const now = new Date();
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, now.getUTCDate()),
  );
  return cutoff.toISOString().slice(0, 10);
}
