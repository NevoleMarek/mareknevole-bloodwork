import { describe, expect, it } from "vitest";

import { deriveStatus } from "@/lib/status";

describe("deriveStatus", () => {
  it("returns normal when value is within range", () => {
    expect(deriveStatus(85, { min: 70, max: 100 })).toBe("normal");
  });

  it("returns low when value is below min", () => {
    expect(deriveStatus(65, { min: 70, max: 100 })).toBe("low");
  });

  it("returns high when value is above max", () => {
    expect(deriveStatus(110, { min: 70, max: 100 })).toBe("high");
  });

  it("returns normal when value equals min", () => {
    expect(deriveStatus(70, { min: 70, max: 100 })).toBe("normal");
  });

  it("returns normal when value equals max", () => {
    expect(deriveStatus(100, { min: 70, max: 100 })).toBe("normal");
  });
});
