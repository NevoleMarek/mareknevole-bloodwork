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
});
