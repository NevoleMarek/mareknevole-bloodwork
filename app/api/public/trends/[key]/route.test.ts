import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/public/trends/[key]/route";
import {
  getCachedBiomarkerTrend,
  getCachedVisibleVocabularyKeys,
} from "@/lib/data-cache";

vi.mock("@/lib/data-cache", () => ({
  getCachedBiomarkerTrend: vi.fn(),
  getCachedVisibleVocabularyKeys: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getCachedBiomarkerTrend).mockReset();
  vi.mocked(getCachedVisibleVocabularyKeys).mockReset();
});

describe("public biomarker trend route", () => {
  it("rejects unknown keys before creating a trend cache entry", async () => {
    vi.mocked(getCachedVisibleVocabularyKeys).mockResolvedValue(["glucose"]);

    const response = await GET(new Request("https://bloodwork.test"), {
      params: Promise.resolve({ key: "random-cache-key" }),
    });

    expect(response.status).toBe(404);
    expect(getCachedBiomarkerTrend).not.toHaveBeenCalled();
  });

  it("returns points for a visible biomarker", async () => {
    vi.mocked(getCachedVisibleVocabularyKeys).mockResolvedValue(["glucose"]);
    vi.mocked(getCachedBiomarkerTrend).mockResolvedValue([
      { date: "2026-01-01", value: 90 },
    ]);

    const response = await GET(new Request("https://bloodwork.test"), {
      params: Promise.resolve({ key: "glucose" }),
    });

    expect(await response.json()).toEqual({
      points: [{ date: "2026-01-01", value: 90 }],
    });
    expect(getCachedBiomarkerTrend).toHaveBeenCalledWith("glucose");
  });
});
