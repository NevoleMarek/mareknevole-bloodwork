import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/public/health/route";
import { getCachedHealth } from "@/lib/data-cache";

vi.mock("@/lib/data-cache", () => ({
  getCachedHealth: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getCachedHealth).mockReset();
});

describe("public health route", () => {
  it("rejects an invalid period", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/public/health?period=forever"),
    );
    expect(response.status).toBe(400);
    expect(getCachedHealth).not.toHaveBeenCalled();
  });

  it("returns the cached period", async () => {
    vi.mocked(getCachedHealth).mockResolvedValue({
      metrics: [],
      configs: [],
    });
    const response = await GET(
      new Request("https://bloodwork.test/api/public/health?period=1Y"),
    );
    expect(await response.json()).toEqual({ metrics: [], configs: [] });
    expect(getCachedHealth).toHaveBeenCalledWith("1Y");
  });
});
