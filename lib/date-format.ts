const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format a display date without shifting date-only values across time zones.
 *
 * ISO date-only strings are parsed as UTC by JavaScript. Formatting that
 * instant in a user's local time zone can therefore show the previous day in
 * zones west of UTC. Date-only clinical values represent a calendar date, so
 * format them at UTC and keep the existing local-time behavior for timestamps.
 */
export function formatDisplayDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const dateOnly = DATE_ONLY.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);

  return date.toLocaleDateString(
    "en-US",
    dateOnly ? { ...options, timeZone: "UTC" } : options,
  );
}
