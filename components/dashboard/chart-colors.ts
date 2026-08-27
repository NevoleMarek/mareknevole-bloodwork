/**
 * Chart colors are kept in one place so the SVG palette can be audited
 * independently from the surrounding dashboard styles.
 *
 * The dashboard charts render on the white surface. Axis text therefore uses
 * the same muted foreground as the page, while every data/trend stroke is
 * deliberately dark enough for WCAG 2.x non-text contrast.
 */
export const CHART_COLORS = {
  axisText: "#63706b",
  primaryData: "#14775f",
  secondaryData: "#4e759d",
  primaryTrend: "#4b5c56",
  secondaryTrend: "#304e67",
  cursor: "#63706b",
  referenceRange: "#4b5c56",
  tooltipText: "#17231f",
  tooltipBackground: "#ffffff",
} as const;
