import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDataHandler } from "@/app/api/data/handler";
import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

const database = { kind: "test-database" } as const;
const getDatabase = vi.fn(async () => database);
const getVocabulary = vi.fn(
  async (_database: typeof database): Promise<VocabularyEntry[]> => [],
);
const getReadings = vi.fn(
  async (
    _database: typeof database,
  ): Promise<Array<BloodworkReading & { id: string }>> => [],
);
const GET = createDataHandler({ getDatabase, getReadings, getVocabulary });

beforeEach(() => {
  getDatabase.mockClear();
  getVocabulary.mockReset().mockResolvedValue([]);
  getReadings.mockReset().mockResolvedValue([]);
});

describe("admin export data", () => {
  it("returns vocabulary and readings without querying health", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({
      vocabulary: { entries: [] },
      readings: [],
    });
    expect(getVocabulary).toHaveBeenCalledOnce();
    expect(getReadings).toHaveBeenCalledOnce();
  });
});
