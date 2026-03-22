import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BloodworkReading, Vocabulary } from "@/types/bloodwork";

function dataPath(filename: string) {
  return join(process.cwd(), "data", filename);
}

export function GET() {
  const vocabulary: Vocabulary = JSON.parse(
    readFileSync(dataPath("vocabulary.json"), "utf-8"),
  );
  const readings: BloodworkReading[] = JSON.parse(
    readFileSync(dataPath("readings.json"), "utf-8"),
  );

  return Response.json({ vocabulary, readings });
}
