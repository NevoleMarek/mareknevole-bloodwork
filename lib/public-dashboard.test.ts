import { describe, expect, it } from "vitest";

import { toPublicDashboardSnapshot } from "@/lib/public-dashboard";

const labs = {
  latestPanel: { date: "2026-08-24", source: "panel.pdf" },
  latestMeasurements: [],
  panelCount: 1,
};

describe("public dashboard snapshot", () => {
  it("omits hidden vocabulary and visibility metadata from serialized props", () => {
    const snapshot = toPublicDashboardSnapshot({
      labs,
      supplements: [],
      vocabulary: [
        {
          key: "visible_marker",
          label: "Visible marker",
          unit: "mg/dL",
          referenceRange: { min: 1, max: 2 },
          description: "Public description",
          featured: true,
          visible: true,
        },
        {
          key: "private_marker",
          label: "Private marker",
          unit: "secret-unit",
          referenceRange: { min: 3, max: 4 },
          description: "Private description",
          featured: false,
          visible: false,
        },
      ],
    });

    const serializedProps = JSON.stringify(snapshot);

    expect(snapshot.vocabulary).toEqual([
      {
        key: "visible_marker",
        label: "Visible marker",
        unit: "mg/dL",
        referenceRange: { min: 1, max: 2 },
        description: "Public description",
        featured: true,
      },
    ]);
    expect(snapshot.vocabulary[0]).not.toHaveProperty("visible");
    expect(serializedProps).not.toContain("private_marker");
    expect(serializedProps).not.toContain("Private marker");
    expect(serializedProps).not.toContain("Private description");
    expect(serializedProps).not.toContain("secret-unit");
  });
});
