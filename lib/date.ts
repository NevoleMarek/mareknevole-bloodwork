import * as Schema from "effect/Schema";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A specimen date is a real calendar date, independent of upload time zones. */
export const isValidSpecimenDate = (value: string): value is string => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day <= daysInMonth[month - 1];
};

/** Canonical date used for a lab specimen collection, never an upload date. */
export const SpecimenDate = Schema.String.pipe(
  Schema.refine(isValidSpecimenDate, {
    message: "Expected a valid specimen date in YYYY-MM-DD format",
  }),
).annotate({ identifier: "SpecimenDate" });
