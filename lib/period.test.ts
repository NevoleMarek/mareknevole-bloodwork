import { afterEach, describe, expect, it, vi } from "vitest";

import { getCutoffDate } from "@/lib/period";

afterEach(() => {
  vi.useRealTimers();
});

describe("getCutoffDate", () => {
  it("subtracts calendar months using UTC dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00.000Z"));

    expect(getCutoffDate("1M")).toBe("2026-07-11");
    expect(getCutoffDate("6M")).toBe("2026-02-11");
    expect(getCutoffDate("1Y")).toBe("2025-08-11");
    expect(getCutoffDate("ALL")).toBeNull();
  });

  it.each([
    ["1M", "2026-03-31T12:00:00.000Z", "2026-02-28"],
    ["1M", "2024-03-31T12:00:00.000Z", "2024-02-29"],
    ["1M", "2026-05-31T12:00:00.000Z", "2026-04-30"],
    ["6M", "2026-08-31T12:00:00.000Z", "2026-02-28"],
    ["6M", "2024-08-31T12:00:00.000Z", "2024-02-29"],
    ["1Y", "2024-02-29T12:00:00.000Z", "2023-02-28"],
  ] as const)(
    "clamps month-end dates to the target month (%s)",
    (period, now, expected) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));

      expect(getCutoffDate(period)).toBe(expected);
    },
  );
});
