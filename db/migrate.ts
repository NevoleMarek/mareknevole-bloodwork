import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BloodworkReading, Vocabulary } from "@/types/bloodwork";

function dataPath(filename: string) {
  return join(process.cwd(), "data", filename);
}

function generateId(): string {
  return crypto.randomUUID();
}

const vocabulary: Vocabulary = JSON.parse(
  readFileSync(dataPath("vocabulary.json"), "utf-8"),
);
const readings: BloodworkReading[] = JSON.parse(
  readFileSync(dataPath("readings.json"), "utf-8"),
);

const lines: string[] = [];

for (const entry of vocabulary.entries) {
  const key = entry.key.replace(/'/g, "''");
  const label = entry.label.replace(/'/g, "''");
  const unit = entry.unit.replace(/'/g, "''");
  lines.push(
    `INSERT INTO vocabulary (key, label, unit, reference_min, reference_max) VALUES ('${key}', '${label}', '${unit}', ${entry.referenceRange.min}, ${entry.referenceRange.max});`,
  );
}

for (const reading of readings) {
  const readingId = generateId();
  const source = reading.source.replace(/'/g, "''");
  lines.push(
    `INSERT INTO readings (id, date, source) VALUES ('${readingId}', '${reading.date}', '${source}');`,
  );

  for (const m of reading.measurements) {
    const mId = generateId();
    const vocabKey = m.vocabularyKey.replace(/'/g, "''");
    const unit = m.unit.replace(/'/g, "''");
    lines.push(
      `INSERT INTO measurements (id, reading_id, vocabulary_key, value, unit, status) VALUES ('${mId}', '${readingId}', '${vocabKey}', ${m.value}, '${unit}', '${m.status}');`,
    );
  }
}

console.log(lines.join("\n"));
