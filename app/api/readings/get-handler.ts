import type { ReadingCursor, ReadingPage } from "@/types/bloodwork";

type ReadingRouteDependencies<Database> = {
  getDatabase: () => Promise<Database>;
  getPage: (
    database: Database,
    cursor: ReadingCursor | null,
  ) => Promise<ReadingPage>;
};

export function createReadingsGetHandler<Database>(
  dependencies: ReadingRouteDependencies<Database>,
) {
  return async function getReadings(request: Request) {
    const params = new URL(request.url).searchParams;
    const date = params.get("date");
    const id = params.get("id");
    const hasDate = params.has("date");
    const hasId = params.has("id");
    const hasCursor = hasDate || hasId;
    if (hasCursor && !(hasDate && hasId)) {
      return Response.json({ error: "Invalid cursor" }, { status: 400 });
    }

    let cursor: ReadingCursor | null = null;
    if (hasCursor) {
      if (date === null || id === null) {
        return Response.json({ error: "Invalid cursor" }, { status: 400 });
      }
      cursor = { date, id };
    }

    const database = await dependencies.getDatabase();
    return Response.json(await dependencies.getPage(database, cursor));
  };
}
