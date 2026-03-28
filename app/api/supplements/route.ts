import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Supplement, SupplementChangelog } from "@/types/bloodwork";

type SupplementsData = {
  supplements: Supplement[];
  changelog: SupplementChangelog[];
};

function filePath() {
  return join(process.cwd(), "data", "supplements.json");
}

function readData(): SupplementsData {
  try {
    return JSON.parse(readFileSync(filePath(), "utf-8")) as SupplementsData;
  } catch {
    return { supplements: [], changelog: [] };
  }
}

function writeData(data: SupplementsData) {
  writeFileSync(filePath(), JSON.stringify(data, null, 2));
}

export function GET() {
  const data = readData();
  const active = data.supplements.filter((s) => !s.stoppedAt);
  return Response.json({ supplements: active, changelog: data.changelog });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name: string;
    dose: string;
    frequency: string;
    startedAt: string;
  };
  const data = readData();
  const now = new Date().toISOString();
  const supplement: Supplement = {
    id: crypto.randomUUID(),
    name: body.name,
    dose: body.dose,
    frequency: body.frequency,
    startedAt: body.startedAt,
    stoppedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  data.supplements.push(supplement);
  data.changelog.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    description: `Added ${body.name} ${body.dose}`,
    createdAt: now,
  });
  writeData(data);
  return Response.json({ ok: true });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    id: string;
    name: string;
    dose: string;
    frequency: string;
  };
  const data = readData();
  const idx = data.supplements.findIndex((s) => s.id === body.id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });

  const old = data.supplements[idx];
  const now = new Date().toISOString();
  const changes: string[] = [];
  if (old.dose !== body.dose)
    changes.push(`Changed ${old.name} from ${old.dose} to ${body.dose}`);
  if (old.frequency !== body.frequency)
    changes.push(`Changed ${old.name} frequency to ${body.frequency}`);
  if (old.name !== body.name)
    changes.push(`Renamed ${old.name} to ${body.name}`);

  data.supplements[idx] = { ...old, ...body, updatedAt: now };

  for (const desc of changes) {
    data.changelog.unshift({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      description: desc,
      createdAt: now,
    });
  }
  writeData(data);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: string };
  const data = readData();
  const idx = data.supplements.findIndex((s) => s.id === id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const supplement = data.supplements[idx];
  data.supplements[idx] = { ...supplement, stoppedAt: now, updatedAt: now };
  data.changelog.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    description: `Removed ${supplement.name}`,
    createdAt: now,
  });
  writeData(data);
  return Response.json({ ok: true });
}
