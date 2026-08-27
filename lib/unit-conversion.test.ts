import { describe, expect, it } from "vitest";

import { convertUnitValue } from "@/lib/unit-conversion";

describe("convertUnitValue", () => {
  it("converts between units in the same concentration family", () => {
    expect(convertUnitValue(100, "mg/dL", "g/dL", "glucose")).toBe(0.1);
    expect(convertUnitValue(0.1, "g/dL", "mg/dL", "glucose")).toBe(100);
  });

  it("uses the analyte molecular weight for glucose mass/molar conversion", () => {
    expect(convertUnitValue(5.1, "mmol/L", "mg/dL", "glucose")).toBeCloseTo(
      91.87956,
      5,
    );
  });

  it("rejects unknown or incompatible units instead of guessing", () => {
    expect(convertUnitValue(1, "unknown", "mg/dL", "glucose")).toBeNull();
    expect(convertUnitValue(1, "mg/dL", "mmHg", "glucose")).toBeNull();
  });
});
