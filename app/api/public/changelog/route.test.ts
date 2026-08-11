import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/public/changelog/route";
import { getSupplementChangelogPage } from "@/db/queries";
import { getCachedFirstChangelogPage } from "@/lib/data-cache";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({ env: { DB: {} } }),
}));

vi.mock("@/db/queries", () => ({
  getSupplementChangelogPage: vi.fn(),
}));

vi.mock("@/lib/data-cache", () => ({
  getCachedFirstChangelogPage: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getCachedFirstChangelogPage).mockReset();
  vi.mocked(getSupplementChangelogPage).mockReset();
});

describe("public changelog route", () => {
  it("loads the first page without a cursor", async () => {
    vi.mocked(getCachedFirstChangelogPage).mockResolvedValue({
      entries: [],
      nextCursor: null,
    });
    const response = await GET(
      new Request("https://bloodwork.test/api/public/changelog"),
    );
    expect(response.status).toBe(200);
    expect(getCachedFirstChangelogPage).toHaveBeenCalledOnce();
    expect(getSupplementChangelogPage).not.toHaveBeenCalled();
  });

  it("rejects a partial cursor", async () => {
    const response = await GET(
      new Request(
        "https://bloodwork.test/api/public/changelog?date=2026-01-01",
      ),
    );
    expect(response.status).toBe(400);
    expect(getCachedFirstChangelogPage).not.toHaveBeenCalled();
    expect(getSupplementChangelogPage).not.toHaveBeenCalled();
  });

  it("loads a complete cursor without creating a persistent cache key", async () => {
    vi.mocked(getSupplementChangelogPage).mockResolvedValue({
      entries: [],
      nextCursor: null,
    });
    const response = await GET(
      new Request(
        "https://bloodwork.test/api/public/changelog?date=2026-01-01&createdAt=2026-01-01T10%3A00%3A00Z&id=c1",
      ),
    );
    expect(response.status).toBe(200);
    expect(getCachedFirstChangelogPage).not.toHaveBeenCalled();
    expect(getSupplementChangelogPage).toHaveBeenCalledWith(
      {},
      {
        date: "2026-01-01",
        createdAt: "2026-01-01T10:00:00Z",
        id: "c1",
      },
    );
  });

  it("loads a server cursor with an empty persisted date", async () => {
    vi.mocked(getSupplementChangelogPage).mockResolvedValue({
      entries: [],
      nextCursor: null,
    });
    const response = await GET(
      new Request(
        "https://bloodwork.test/api/public/changelog?date=&createdAt=2026-01-01T10%3A00%3A00Z&id=c1",
      ),
    );
    expect(response.status).toBe(200);
    expect(getSupplementChangelogPage).toHaveBeenCalledWith(
      {},
      {
        date: "",
        createdAt: "2026-01-01T10:00:00Z",
        id: "c1",
      },
    );
  });
});
