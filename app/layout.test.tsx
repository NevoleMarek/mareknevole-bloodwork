import { describe, expect, it } from "vitest";

import {
  appJsonLd,
  personalTrackingDisclaimer,
  publicDashboardDescription,
  publicMetadata,
} from "@/lib/site-metadata";

describe("public metadata", () => {
  it("uses the same personal-tracking disclaimer in every public description", () => {
    const descriptions = [
      publicMetadata.description,
      publicMetadata.openGraph?.description,
      publicMetadata.twitter?.description,
      appJsonLd.description,
    ];

    expect(descriptions).toEqual(
      descriptions.map(() => publicDashboardDescription),
    );
    expect(publicDashboardDescription).toContain(personalTrackingDisclaimer);
    expect(publicDashboardDescription).toMatch(/not medical advice/i);
  });
});
