import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getActiveSupplements, getSupplementChangelog } from "@/db/queries";

export async function GET() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const supplements = await getActiveSupplements(db);
  const changelog = await getSupplementChangelog(db);

  return Response.json({ supplements, changelog });
}

export async function POST(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const body = (await req.json()) as {
    name: string;
    dose: string;
    frequency: string;
    startedAt: string;
    changelogDate: string;
  };

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO supplements (id, name, dose, frequency, started_at, stopped_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)",
    )
    .bind(id, body.name, body.dose, body.frequency, body.startedAt, now, now)
    .run();

  await db
    .prepare(
      "INSERT INTO supplement_changelog (id, date, description, created_at) VALUES (?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      body.changelogDate,
      `Added ${body.name} ${body.dose}`,
      now,
    )
    .run();

  revalidatePath("/");

  return Response.json({ ok: true });
}

export async function PUT(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const body = (await req.json()) as {
    id: string;
    name: string;
    dose: string;
    frequency: string;
    changelogDate: string;
  };

  const old = await db
    .prepare("SELECT * FROM supplements WHERE id = ?")
    .bind(body.id)
    .first<{ name: string; dose: string; frequency: string }>();

  if (!old) return Response.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const changes: string[] = [];
  if (old.dose !== body.dose)
    changes.push(`Changed ${old.name} from ${old.dose} to ${body.dose}`);
  if (old.frequency !== body.frequency)
    changes.push(`Changed ${old.name} frequency to ${body.frequency}`);
  if (old.name !== body.name)
    changes.push(`Renamed ${old.name} to ${body.name}`);

  await db
    .prepare(
      "UPDATE supplements SET name = ?, dose = ?, frequency = ?, updated_at = ? WHERE id = ?",
    )
    .bind(body.name, body.dose, body.frequency, now, body.id)
    .run();

  for (const desc of changes) {
    await db
      .prepare(
        "INSERT INTO supplement_changelog (id, date, description, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), body.changelogDate, desc, now)
      .run();
  }

  revalidatePath("/");

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { id, changelogDate } = (await req.json()) as {
    id: string;
    changelogDate: string;
  };

  const supplement = await db
    .prepare("SELECT name FROM supplements WHERE id = ?")
    .bind(id)
    .first<{ name: string }>();

  if (!supplement)
    return Response.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();

  await db
    .prepare(
      "UPDATE supplements SET stopped_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(now, now, id)
    .run();

  await db
    .prepare(
      "INSERT INTO supplement_changelog (id, date, description, created_at) VALUES (?, ?, ?, ?)",
    )
    .bind(crypto.randomUUID(), changelogDate, `Removed ${supplement.name}`, now)
    .run();

  revalidatePath("/");

  return Response.json({ ok: true });
}
