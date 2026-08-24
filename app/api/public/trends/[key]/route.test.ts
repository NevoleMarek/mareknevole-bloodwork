import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTrendHandler } from "@/app/api/public/trends/[key]/handler";
import type { BiomarkerTrendPoint } from "@/types/bloodwork";

const getTrend = vi.fn(
  async (_key: string): Promise<BiomarkerTrendPoint[]> => [],
);
const getVisibleKeys = vi.fn(async (): Promise<string[]> => []);
const GET = createTrendHandler({ getTrend, getVisibleKeys });

beforeEach(() => {
  getTrend.mockReset();
  getVisibleKeys.mockReset();
});

describe("public biomarker trend route", () => {
  it("rejects unknown keys before creating a trend cache entry", async () => {
    getVisibleKeys.mockResolvedValue(["glucose"]);

    const response = await GET(new Request("https://bloodwork.test"), {
      params: Promise.resolve({ key: "random-cache-key" }),
    });

    expect(response.status).toBe(404);
    expect(getTrend).not.toHaveBeenCalled();
  });

  it("returns points for a visible biomarker", async () => {
    getVisibleKeys.mockResolvedValue(["glucose"]);
    getTrend.mockResolvedValue([{ date: "2026-01-01", value: 90 }]);

    const response = await GET(new Request("https://bloodwork.test"), {
      params: Promise.resolve({ key: "glucose" }),
    });

    expect(await response.json()).toEqual({
      points: [{ date: "2026-01-01", value: 90 }],
    });
    expect(getTrend).toHaveBeenCalledWith("glucose");
  });
});
