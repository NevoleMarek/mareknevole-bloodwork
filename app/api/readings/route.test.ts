import { beforeEach, describe, expect, it, vi } from "vitest";

import { createReadingsGetHandler } from "@/app/api/readings/get-handler";
import type { ReadingCursor, ReadingPage } from "@/types/bloodwork";

const database = { kind: "test-database" } as const;
const getDatabase = vi.fn(async () => database);
const getPage = vi.fn(
  async (
    _database: typeof database,
    _cursor: ReadingCursor | null,
  ): Promise<ReadingPage> => ({ entries: [], nextCursor: null }),
);
const GET = createReadingsGetHandler({ getDatabase, getPage });

beforeEach(() => {
  getDatabase.mockClear();
  getPage.mockReset();
  getPage.mockResolvedValue({
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
    expect(getPage).toHaveBeenCalledWith(database, null);
  });

  it("rejects a partial cursor", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/readings?date=2026-01-01"),
    );

    expect(response.status).toBe(400);
    expect(getPage).not.toHaveBeenCalled();
  });

  it("loads a complete cursor", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/readings?date=2026-01-01&id=r1"),
    );

    expect(response.status).toBe(200);
    expect(getPage).toHaveBeenCalledWith(database, {
      date: "2026-01-01",
      id: "r1",
    });
  });

  it("loads a server cursor with an empty persisted date", async () => {
    const response = await GET(
      new Request("https://bloodwork.test/api/readings?date=&id=r1"),
    );

    expect(response.status).toBe(200);
    expect(getPage).toHaveBeenCalledWith(database, { date: "", id: "r1" });
  });
});
