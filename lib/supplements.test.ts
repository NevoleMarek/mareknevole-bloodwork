import { describe, expect, it } from "vitest";

import {
  formatSupplementMonth,
  isSupplementActive,
  isSupplementChangelogDate,
  isSupplementStartMonth,
} from "@/lib/supplements";

describe("supplement dates", () => {
  it("accepts real calendar months and rejects malformed values", () => {
    expect(isSupplementStartMonth("2026-08")).toBe(true);
    expect(isSupplementStartMonth("2026-13")).toBe(false);
    expect(isSupplementStartMonth("Aug 2026")).toBe(false);
  });

  it("accepts real changelog dates and rejects impossible days", () => {
    expect(isSupplementChangelogDate("2026-02-28")).toBe(true);
    expect(isSupplementChangelogDate("2026-02-29")).toBe(false);
    expect(isSupplementChangelogDate("2026-02-30")).toBe(false);
  });

  it("does not treat future or invalid intervals as active", () => {
    const asOf = "2026-08-27T12:00:00.000Z";
    expect(
      isSupplementActive({ startedAt: "2026-09", stoppedAt: null }, asOf),
    ).toBe(false);
    expect(
      isSupplementActive(
        {
          startedAt: "2026-08",
          stoppedAt: "2026-08-27T12:00:00.000Z",
        },
        asOf,
      ),
    ).toBe(false);
    expect(
      isSupplementActive(
        {
          startedAt: "2026-09",
          stoppedAt: "2026-08-28T00:00:00.000Z",
        },
        asOf,
      ),
    ).toBe(false);
    expect(
      isSupplementActive({ startedAt: "Aug 2026", stoppedAt: null }, asOf),
    ).toBe(false);
  });

  it("keeps a malformed start visible as unclear instead of Invalid Date", () => {
    expect(formatSupplementMonth("not-a-month")).toBe("Unclear (not-a-month)");
    expect(formatSupplementMonth("")).toBe("Not recorded");
    expect(formatSupplementMonth("2026-08")).toBe("Aug 2026");
  });
});
