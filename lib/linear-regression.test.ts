import { describe, expect, it } from "vitest";

import { linearRegression } from "@/lib/linear-regression";

describe("linearRegression", () => {
  it("returns a flat line for constant values", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    const result = linearRegression(points);
    expect(result.slope).toBeCloseTo(0);
    expect(result.intercept).toBeCloseTo(5);
  });

  it("returns correct slope for a perfect line", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ];
    const result = linearRegression(points);
    expect(result.slope).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(0);
  });

  it("returns zero slope for a single point", () => {
    const result = linearRegression([{ x: 3, y: 7 }]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(7);
  });

  it("returns zero slope for empty input", () => {
    const result = linearRegression([]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(0);
  });
});
