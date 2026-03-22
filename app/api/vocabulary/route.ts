import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Vocabulary, VocabularyEntry } from "@/types/bloodwork";

function vocabPath() {
  return join(process.cwd(), "data", "vocabulary.json");
}

function readVocabulary(): Vocabulary {
  return JSON.parse(readFileSync(vocabPath(), "utf-8")) as Vocabulary;
}

function writeVocabulary(v: Vocabulary) {
  writeFileSync(vocabPath(), JSON.stringify(v, null, 2));
}

export async function POST(req: Request) {
  const { entry } = (await req.json()) as { entry: VocabularyEntry };
  const vocab = readVocabulary();
  vocab.entries.push(entry);
  writeVocabulary(vocab);
  return Response.json({ ok: true });
}

export async function PUT(req: Request) {
  const { entry } = (await req.json()) as { entry: VocabularyEntry };
  const vocab = readVocabulary();
  const idx = vocab.entries.findIndex((e) => e.key === entry.key);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
  vocab.entries[idx] = entry;
  writeVocabulary(vocab);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { key } = (await req.json()) as { key: string };
  const vocab = readVocabulary();
  vocab.entries = vocab.entries.filter((e) => e.key !== key);
  writeVocabulary(vocab);
  return Response.json({ ok: true });
}
