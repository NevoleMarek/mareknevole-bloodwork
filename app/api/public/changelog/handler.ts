import type { ChangelogCursor, ChangelogPage } from "@/types/bloodwork";

type ChangelogRouteDependencies<Database> = {
  getDatabase: () => Promise<Database>;
  getFirstPage: () => Promise<ChangelogPage>;
  getPage: (
    database: Database,
    cursor: ChangelogCursor | null,
  ) => Promise<ChangelogPage>;
};

export function createChangelogHandler<Database>(
  dependencies: ChangelogRouteDependencies<Database>,
) {
  return async function getChangelog(request: Request) {
    const params = new URL(request.url).searchParams;
    const date = params.get("date");
    const createdAt = params.get("createdAt");
    const id = params.get("id");
    const hasDate = params.has("date");
    const hasCreatedAt = params.has("createdAt");
    const hasId = params.has("id");
    const hasCursor = hasDate || hasCreatedAt || hasId;
    if (hasCursor && !(hasDate && hasCreatedAt && hasId)) {
      return Response.json({ error: "Invalid cursor" }, { status: 400 });
    }

    if (!hasCursor) return Response.json(await dependencies.getFirstPage());
    if (date === null || createdAt === null || id === null) {
      return Response.json({ error: "Invalid cursor" }, { status: 400 });
    }

    const database = await dependencies.getDatabase();
    return Response.json(
      await dependencies.getPage(database, { date, createdAt, id }),
    );
  };
}
