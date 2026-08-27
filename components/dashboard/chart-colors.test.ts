import { describe, expect, it } from "vitest";

import { CHART_COLORS } from "@/components/dashboard/chart-colors";

const WHITE = "#ffffff";

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("dashboard chart color contrast", () => {
  it("keeps axis and tooltip text at WCAG AA contrast on the chart surface", () => {
    const axisTextRatio = contrastRatio(CHART_COLORS.axisText, WHITE);
    const tooltipTextRatio = contrastRatio(CHART_COLORS.tooltipText, WHITE);

    expect(axisTextRatio).toBeCloseTo(5.172, 3);
    expect(axisTextRatio).toBeGreaterThanOrEqual(4.5);
    expect(tooltipTextRatio).toBeCloseTo(16.196, 3);
    expect(tooltipTextRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps every chart stroke at WCAG non-text contrast on the chart surface", () => {
    const strokes: ReadonlyArray<{
      name: string;
      color: string;
      expectedRatio: number;
    }> = [
      {
        name: "primaryData",
        color: CHART_COLORS.primaryData,
        expectedRatio: 5.478,
      },
      {
        name: "secondaryData",
        color: CHART_COLORS.secondaryData,
        expectedRatio: 4.822,
      },
      {
        name: "primaryTrend",
        color: CHART_COLORS.primaryTrend,
        expectedRatio: 7.084,
      },
      {
        name: "secondaryTrend",
        color: CHART_COLORS.secondaryTrend,
        expectedRatio: 8.709,
      },
      { name: "cursor", color: CHART_COLORS.cursor, expectedRatio: 5.172 },
      {
        name: "referenceRange",
        color: CHART_COLORS.referenceRange,
        expectedRatio: 7.084,
      },
    ];

    for (const { name, color, expectedRatio } of strokes) {
      const ratio = contrastRatio(color, WHITE);
      expect(ratio, `${name} contrast`).toBeCloseTo(expectedRatio, 3);
      expect(ratio, `${name} contrast`).toBeGreaterThanOrEqual(3);
    }
  });
});
