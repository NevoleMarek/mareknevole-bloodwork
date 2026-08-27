import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { isValidSpecimenDate, SpecimenDate } from "@/lib/date";

describe("specimen dates", () => {
  it.each(["2026-01-01", "2024-02-29", "0001-01-01", "9999-12-31"])(
    "accepts canonical calendar date %s",
    (date) => {
      expect(isValidSpecimenDate(date)).toBe(true);
      expect(Schema.decodeSync(SpecimenDate)(date)).toBe(date);
    },
  );

  it.each([
    "",
    "2026-1-01",
    "2026-01-1",
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "today",
    "2026-01-01T00:00:00Z",
  ])("rejects missing or invalid specimen date %#", (date) => {
    expect(isValidSpecimenDate(date)).toBe(false);
    expect(() => Schema.decodeSync(SpecimenDate)(date)).toThrow();
  });

  it.each([null, undefined])(
    "rejects a non-string specimen date %#",
    (date) => {
      expect(() => Schema.decodeUnknownSync(SpecimenDate)(date)).toThrow();
    },
  );
});
