import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHealthHandler } from "@/app/api/public/health/handler";
import type { Period } from "@/lib/period";
import type { HealthData } from "@/types/health";

const getHealth = vi.fn(async (_period: Period): Promise<HealthData> => ({
  metrics: [],
  configs: [],
}));
const GET = createHealthHandler({ getHealth });

beforeEach(() => {
  getHealth.mockReset();
});

describe("public health route", () => {
  it("rejects an invalid period", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/public/health?period=forever"),
    );
    expect(response.status).toBe(400);
    expect(getHealth).not.toHaveBeenCalled();
  });

  it("returns the cached period", async () => {
    getHealth.mockResolvedValue({
      metrics: [],
      configs: [],
    });
    const response = await GET(
      new Request("https://bloodwork.test/api/public/health?period=1Y"),
    );
    expect(await response.json()).toEqual({ metrics: [], configs: [] });
    expect(getHealth).toHaveBeenCalledWith("1Y");
  });
});
