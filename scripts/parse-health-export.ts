import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

// -- Types --

export type RawRecord = {
  type: string;
  startDate: string;
  endDate: string;
  value: string;
  unit: string;
};

type DayBucket = { sum: number; count: number };

// -- Aggregation config --

const SUM_TYPES = new Set([
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierBasalEnergyBurned",
  "HKQuantityTypeIdentifierFlightsClimbed",
  "HKQuantityTypeIdentifierDistanceWalkingRunning",
  "HKQuantityTypeIdentifierAppleExerciseTime",
]);

const SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis";

const ASLEEP_VALUES = new Set([
  "HKCategoryValueSleepAnalysisAsleepUnspecified",
  "HKCategoryValueSleepAnalysisAsleepCore",
  "HKCategoryValueSleepAnalysisAsleepDeep",
  "HKCategoryValueSleepAnalysisAsleepREM",
]);

const AGGREGATION_MAP: Record<string, "avg" | "sum" | "duration"> = {};
for (const t of SUM_TYPES) AGGREGATION_MAP[t] = "sum";
AGGREGATION_MAP[SLEEP_TYPE] = "duration";

// -- Helpers --

export function deriveMetricKey(type: string): string {
  const stripped = type
    .replace("HKQuantityTypeIdentifier", "")
    .replace("HKCategoryTypeIdentifier", "");
  return stripped
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

export function deriveLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function parseDurationHours(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

// -- Aggregation --

export function aggregateRecords(records: RawRecord[]) {
  const buckets = new Map<string, Map<string, DayBucket>>();
  const metricMeta = new Map<
    string,
    { type: string; unit: string; key: string }
  >();

  for (const r of records) {
    const key = deriveMetricKey(r.type);
    const date = parseDate(r.startDate);
    const aggregation = AGGREGATION_MAP[r.type] ?? "avg";

    if (!metricMeta.has(key)) {
      metricMeta.set(key, { type: r.type, unit: r.unit, key });
    }

    let value: number;
    if (aggregation === "duration") {
      if (!ASLEEP_VALUES.has(r.value)) continue;
      value = parseDurationHours(r.startDate, r.endDate);
    } else {
      value = parseFloat(r.value);
      if (!isFinite(value)) continue;
    }

    if (!buckets.has(key)) buckets.set(key, new Map());
    const dayMap = buckets.get(key)!;
    const bucket = dayMap.get(date) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    dayMap.set(date, bucket);
  }

  const metrics: {
    date: string;
    metric: string;
    value: number;
    unit: string;
  }[] = [];
  const configs: {
    metric: string;
    label: string;
    unit: string;
    aggregation: string;
  }[] = [];

  for (const [key, dayMap] of buckets) {
    const meta = metricMeta.get(key)!;
    const aggregation = AGGREGATION_MAP[meta.type] ?? "avg";
    const unit = aggregation === "duration" ? "hr" : meta.unit;

    configs.push({
      metric: key,
      label: deriveLabel(key),
      unit,
      aggregation,
    });

    for (const [date, bucket] of dayMap) {
      const value =
        aggregation === "avg"
          ? Math.round((bucket.sum / bucket.count) * 100) / 100
          : Math.round(bucket.sum * 100) / 100;
      metrics.push({ date, metric: key, value, unit });
    }
  }

  metrics.sort((a, b) => a.date.localeCompare(b.date));
  configs.sort((a, b) => a.label.localeCompare(b.label));

  return { metrics, configs };
}

// -- XML line parsing --

function extractAttr(line: string, name: string): string | null {
  const re = new RegExp(`${name}="([^"]*)"`);
  const match = re.exec(line);
  return match ? match[1] : null;
}

export function parseRecordLine(line: string): RawRecord | null {
  if (!line.includes("<Record ")) return null;
  const type = extractAttr(line, "type");
  const startDate = extractAttr(line, "startDate");
  const endDate = extractAttr(line, "endDate");
  const value = extractAttr(line, "value") ?? "";
  const unit = extractAttr(line, "unit") ?? "";
  if (!type || !startDate || !endDate) return null;
  return { type, startDate, endDate, value, unit };
}

// -- CLI --

async function main() {
  const inputPath = process.argv[2];
  const outputFlag = process.argv.indexOf("-o");
  const outputPath =
    outputFlag !== -1 ? process.argv[outputFlag + 1] : "health-data.json";

  if (!inputPath) {
    console.error(
      "Usage: bun run scripts/parse-health-export.ts <export.xml> [-o output.json]",
    );
    process.exit(1);
  }

  console.error(`Parsing ${inputPath}...`);

  const records: RawRecord[] = [];
  const rl = createInterface({ input: createReadStream(inputPath) });

  for await (const line of rl) {
    const record = parseRecordLine(line);
    if (record) records.push(record);
  }

  console.error(`Found ${records.length} records`);

  const result = aggregateRecords(records);

  console.error(
    `Output: ${result.metrics.length} daily values, ${result.configs.length} metric types`,
  );

  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.error(`Written to ${outputPath}`);
}

// Run when executed directly via bun/node
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/.*\//, ""));
if (isMain) {
  main();
}
