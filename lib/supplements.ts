export const SUPPLEMENT_START_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const SUPPLEMENT_CHANGELOG_DATE_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export type SupplementDates = {
  readonly startedAt: string;
  readonly stoppedAt: string | null;
};

export function isSupplementStartMonth(value: string): boolean {
  if (!SUPPLEMENT_START_MONTH_PATTERN.test(value)) return false;
  const date = new Date(`${value}-01T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

export function isSupplementChangelogDate(value: string): boolean {
  if (!SUPPLEMENT_CHANGELOG_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function parseStartMonth(value: string): Date | null {
  if (!isSupplementStartMonth(value)) return null;
  return new Date(`${value}-01T00:00:00.000Z`);
}

function parseStoppedAt(value: string | null): Date | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAsOf(value: Date | string): Date | null {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Returns true only for a well-formed supplement interval that includes the
 * supplied instant. Invalid persisted dates are intentionally not active.
 */
export function isSupplementActive(
  supplement: SupplementDates,
  asOf: Date | string = new Date(),
): boolean {
  const startedAt = parseStartMonth(supplement.startedAt);
  const asOfDate = parseAsOf(asOf);
  if (!startedAt || !asOfDate) return false;

  const stoppedAt = parseStoppedAt(supplement.stoppedAt);
  if (supplement.stoppedAt !== null && !stoppedAt) return false;
  if (stoppedAt && stoppedAt <= startedAt) return false;

  return startedAt <= asOfDate && (!stoppedAt || stoppedAt > asOfDate);
}

export function formatSupplementMonth(
  value: string | null | undefined,
): string {
  const date = value ? parseStartMonth(value) : null;
  if (!date) return value?.trim() ? `Unclear (${value})` : "Not recorded";
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function supplementSafetyValue(
  value: string | null | undefined,
): string {
  return value?.trim() || "Not recorded";
}
