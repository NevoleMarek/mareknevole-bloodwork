import { afterEach, describe, expect, it } from "vitest";

import { formatDisplayDate } from "@/lib/date-format";

const originalTimezone = process.env.TZ;

afterEach(() => {
  if (originalTimezone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTimezone;
  }
});

describe("formatDisplayDate", () => {
  it.each(["America/Los_Angeles", "Europe/Prague"])(
    "keeps date-only values on the same calendar date in %s",
    (timezone) => {
      process.env.TZ = timezone;

      expect(
        formatDisplayDate("2026-01-10", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      ).toBe("Jan 10, 2026");
    },
  );

  it("preserves local-time behavior for time-bearing values", () => {
    process.env.TZ = "America/Los_Angeles";

    expect(
      formatDisplayDate("2026-01-10T01:30:00Z", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    ).toBe("Jan 9, 2026");
  });
});
