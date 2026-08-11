import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/readings/route";
import { getReadingPage } from "@/db/queries";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({ env: { DB: {} } }),
}));

vi.mock("@/db/queries", () => ({
  getReadingPage: vi.fn(),
}));

vi.mock("@/lib/data-cache", () => ({
  invalidateDashboard: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getReadingPage).mockReset();
  vi.mocked(getReadingPage).mockResolvedValue({
    entries: [],
    nextCursor: null,
  });
});

describe("readings route", () => {
  it("loads the first page without a cursor", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/readings"),
    );

    expect(response.status).toBe(200);
    expect(getReadingPage).toHaveBeenCalledWith({}, null);
  });

  it("rejects a partial cursor", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/readings?date=2026-01-01"),
    );

    expect(response.status).toBe(400);
    expect(getReadingPage).not.toHaveBeenCalled();
  });

  it("loads a complete cursor", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/readings?date=2026-01-01&id=r1"),
    );

    expect(response.status).toBe(200);
    expect(getReadingPage).toHaveBeenCalledWith(
      {},
      { date: "2026-01-01", id: "r1" },
    );
  });

  it("loads a server cursor with an empty persisted date", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/readings?date=&id=r1"),
    );

    expect(response.status).toBe(200);
    expect(getReadingPage).toHaveBeenCalledWith({}, { date: "", id: "r1" });
  });
});
