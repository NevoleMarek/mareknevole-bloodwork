import { formatDisplayDate } from "@/lib/date-format";

const SPAN_OPTIONS = {
  month: "short",
  day: "numeric",
  year: "numeric",
} satisfies Intl.DateTimeFormatOptions;

export function formatDateSpan(dates: readonly string[]): string {
  const first = formatDisplayDate(dates[0], SPAN_OPTIONS);
  const last = formatDisplayDate(dates[dates.length - 1], SPAN_OPTIONS);
  return first === last ? first : `${first} – ${last}`;
}

export function formatValueRange(
  points: readonly { value: number }[],
  format: (value: number) => string = String,
): string {
  const values = points.map((point) => point.value);
  const low = format(Math.min(...values));
  const high = format(Math.max(...values));
  return low === high ? low : `${low} to ${high}`;
}
