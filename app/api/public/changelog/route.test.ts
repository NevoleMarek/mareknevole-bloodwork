import { beforeEach, describe, expect, it, vi } from "vitest";

import { createChangelogHandler } from "@/app/api/public/changelog/handler";
import type { ChangelogCursor, ChangelogPage } from "@/types/bloodwork";

const database = { kind: "test-database" } as const;
const getDatabase = vi.fn(async () => database);
const getFirstPage = vi.fn(async (): Promise<ChangelogPage> => ({
  entries: [],
  nextCursor: null,
}));
const getPage = vi.fn(
  async (
    _database: typeof database,
    _cursor: ChangelogCursor | null,
  ): Promise<ChangelogPage> => ({ entries: [], nextCursor: null }),
);
const GET = createChangelogHandler({ getDatabase, getFirstPage, getPage });

beforeEach(() => {
  getDatabase.mockClear();
  getFirstPage.mockReset();
  getPage.mockReset();
});

describe("public changelog route", () => {
  it("loads the first page without a cursor", async () => {
    getFirstPage.mockResolvedValue({
      entries: [],
      nextCursor: null,
    });
    const response = await GET(
      new Request("https://bloodwork.test/api/public/changelog"),
    );
    expect(response.status).toBe(200);
    expect(getFirstPage).toHaveBeenCalledOnce();
    expect(getPage).not.toHaveBeenCalled();
  });

  it("rejects a partial cursor", async () => {
    const response = await GET(
      new Request(
        "https://bloodwork.test/api/public/changelog?date=2026-01-01",
      ),
    );
    expect(response.status).toBe(400);
    expect(getFirstPage).not.toHaveBeenCalled();
    expect(getPage).not.toHaveBeenCalled();
  });

  it("loads a complete cursor without creating a persistent cache key", async () => {
    getPage.mockResolvedValue({
      entries: [],
      nextCursor: null,
    });
    const response = await GET(
      new Request(
        "https://bloodwork.test/api/public/changelog?date=2026-01-01&createdAt=2026-01-01T10%3A00%3A00Z&id=c1",
      ),
    );
    expect(response.status).toBe(200);
    expect(getFirstPage).not.toHaveBeenCalled();
    expect(getPage).toHaveBeenCalledWith(database, {
      date: "2026-01-01",
      createdAt: "2026-01-01T10:00:00Z",
      id: "c1",
    });
  });

  it("loads a server cursor with an empty persisted date", async () => {
    getPage.mockResolvedValue({
      entries: [],
      nextCursor: null,
    });
    const response = await GET(
      new Request(
        "https://bloodwork.test/api/public/changelog?date=&createdAt=2026-01-01T10%3A00%3A00Z&id=c1",
      ),
    );
    expect(response.status).toBe(200);
    expect(getPage).toHaveBeenCalledWith(database, {
      date: "",
      createdAt: "2026-01-01T10:00:00Z",
      id: "c1",
    });
  });
});
