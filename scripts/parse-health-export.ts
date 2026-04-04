import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

// -- Types --

export type RawRecord = {
  type: string;
  sourceName: string;
  startDate: string;
  endDate: string;
  value: string;
  unit: string;
};

type DayBucket = { sum: number; count: number };
type SourceDayBuckets = Map<string, Map<string, DayBucket>>; // source -> date -> bucket

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

type MetricMeta = Map<string, { type: string; unit: string; key: string }>;

type AccState = {
  /** Buckets for avg/duration metrics (no source dedup needed) */
  buckets: Map<string, Map<string, DayBucket>>;
  /** Per-source buckets for sum metrics (pick primary source later) */
  sumBuckets: Map<string, SourceDayBuckets>;
  metricMeta: MetricMeta;
};

function createAccState(): AccState {
  return {
    buckets: new Map(),
    sumBuckets: new Map(),
    metricMeta: new Map(),
  };
}

function accumulateRecord(r: RawRecord, state: AccState) {
  const key = deriveMetricKey(r.type);
  const date = parseDate(r.startDate);
  const aggregation = AGGREGATION_MAP[r.type] ?? "avg";

  if (!state.metricMeta.has(key)) {
    state.metricMeta.set(key, { type: r.type, unit: r.unit, key });
  }

  let value: number;
  if (aggregation === "duration") {
    if (!ASLEEP_VALUES.has(r.value)) return;
    value = parseDurationHours(r.startDate, r.endDate);
  } else {
    value = parseFloat(r.value);
    if (!isFinite(value)) return;
  }

  if (aggregation === "sum") {
    // Track per-source so we can pick the primary source later
    if (!state.sumBuckets.has(key)) state.sumBuckets.set(key, new Map());
    const bySource = state.sumBuckets.get(key)!;
    if (!bySource.has(r.sourceName)) bySource.set(r.sourceName, new Map());
    const dayMap = bySource.get(r.sourceName)!;
    const bucket = dayMap.get(date) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    dayMap.set(date, bucket);
  } else {
    if (!state.buckets.has(key)) state.buckets.set(key, new Map());
    const dayMap = state.buckets.get(key)!;
    const bucket = dayMap.get(date) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    dayMap.set(date, bucket);
  }
}

function pickPrimarySource(bySource: SourceDayBuckets): Map<string, DayBucket> {
  let best = "";
  let bestCount = 0;
  for (const [source, dayMap] of bySource) {
    let total = 0;
    for (const bucket of dayMap.values()) total += bucket.count;
    if (total > bestCount) {
      best = source;
      bestCount = total;
    }
  }
  return bySource.get(best) ?? new Map();
}

function finalizeState(state: AccState) {
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

  // Resolve sum metrics: pick primary source per type
  for (const [key, bySource] of state.sumBuckets) {
    state.buckets.set(key, pickPrimarySource(bySource));
  }

  for (const [key, dayMap] of state.buckets) {
    const meta = state.metricMeta.get(key)!;
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

export function aggregateRecords(records: RawRecord[]) {
  const state = createAccState();
  for (const r of records) accumulateRecord(r, state);
  return finalizeState(state);
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
  const sourceName = extractAttr(line, "sourceName") ?? "";
  const startDate = extractAttr(line, "startDate");
  const endDate = extractAttr(line, "endDate");
  const value = extractAttr(line, "value") ?? "";
  const unit = extractAttr(line, "unit") ?? "";
  if (!type || !startDate || !endDate) return null;
  return { type, sourceName, startDate, endDate, value, unit };
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

  const state = createAccState();
  let recordCount = 0;

  const rl = createInterface({ input: createReadStream(inputPath) });
  for await (const line of rl) {
    const r = parseRecordLine(line);
    if (!r) continue;
    recordCount++;
    accumulateRecord(r, state);
  }

  console.error(`Found ${recordCount} records`);

  const result = finalizeState(state);

  console.error(
    `Output: ${result.metrics.length} daily values, ${result.configs.length} metric types`,
  );

  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.error(`Written to ${outputPath}`);
}

// Run when executed directly via bun/node
const scriptPath = new URL(import.meta.url).pathname;
if (process.argv[1] === scriptPath) {
  main();
}
