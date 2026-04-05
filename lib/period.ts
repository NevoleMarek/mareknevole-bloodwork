export type Period = "1M" | "6M" | "1Y" | "ALL";

export const PERIODS: Period[] = ["1M", "6M", "1Y", "ALL"];

export function isPeriod(value: unknown): value is Period {
  return PERIODS.includes(value as Period);
}

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
  const cutoff = new Date(now.getFullYear(), now.getMonth() - m, now.getDate());
  return cutoff.toISOString().slice(0, 10);
}
