import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/data/route";
import { getReadingsWithMeasurements, getVocabulary } from "@/db/queries";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({ env: { DB: {} } }),
}));

vi.mock("@/db/queries", () => ({
  getVocabulary: vi.fn(),
  getReadingsWithMeasurements: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getVocabulary).mockReset().mockResolvedValue([]);
  vi.mocked(getReadingsWithMeasurements).mockReset().mockResolvedValue([]);
});

describe("admin export data", () => {
  it("returns vocabulary and readings without querying health", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({
      vocabulary: { entries: [] },
      readings: [],
    });
    expect(getVocabulary).toHaveBeenCalledOnce();
    expect(getReadingsWithMeasurements).toHaveBeenCalledOnce();
  });
});
