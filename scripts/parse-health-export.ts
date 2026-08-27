import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

import type { HealthImportConfig } from "@/lib/schemas/wire";
import type { HealthMetric } from "@/lib/schemas/domain";

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
type Interval = { start: number; end: number; value: number };

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
  /** Buckets for avg/duration metrics (no dedup needed) */
  buckets: Map<string, Map<string, DayBucket>>;
  /** Raw intervals for sum metrics, keyed by "metric:date" */
  sumIntervals: Map<string, Interval[]>;
  metricMeta: MetricMeta;
};

function createAccState(): AccState {
  return {
    buckets: new Map(),
    sumIntervals: new Map(),
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
    const slotKey = `${key}:${date}`;
    if (!state.sumIntervals.has(slotKey)) state.sumIntervals.set(slotKey, []);
    state.sumIntervals.get(slotKey)!.push({
      start: new Date(r.startDate).getTime(),
      end: new Date(r.endDate).getTime(),
      value,
    });
  } else {
    if (!state.buckets.has(key)) state.buckets.set(key, new Map());
    const dayMap = state.buckets.get(key)!;
    const bucket = dayMap.get(date) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    dayMap.set(date, bucket);
  }
}

/**
 * Deduplicate overlapping intervals for sum metrics.
 * Sweep every interval boundary and use the highest value rate
 * (value/duration) for each segment. Non-overlapping intervals sum normally.
 */
export function deduplicateIntervals(intervals: Interval[]): number {
  const valid = intervals.filter(
    (interval) =>
      Number.isFinite(interval.start) &&
      Number.isFinite(interval.end) &&
      interval.end > interval.start &&
      Number.isFinite(interval.value),
  );
  if (valid.length === 0) return 0;

  const rates = valid.map(
    (interval) => interval.value / (interval.end - interval.start),
  );
  const events = valid.flatMap((interval, index) => [
    { time: interval.start, index, kind: "start" as const },
    { time: interval.end, index, kind: "end" as const },
  ]);
  events.sort((a, b) => a.time - b.time);

  const active: number[] = [];
  const compareRates = (left: number, right: number) =>
    rates[left] - rates[right];
  const pushActive = (index: number) => {
    active.push(index);
    let child = active.length - 1;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (compareRates(active[parent], active[child]) >= 0) break;
      [active[parent], active[child]] = [active[child], active[parent]];
      child = parent;
    }
  };
  const popActive = () => {
    const top = active[0];
    const last = active.pop();
    if (active.length > 0 && last !== undefined) {
      active[0] = last;
      let parent = 0;
      while (true) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let largest = parent;
        if (
          left < active.length &&
          compareRates(active[left], active[largest]) > 0
        ) {
          largest = left;
        }
        if (
          right < active.length &&
          compareRates(active[right], active[largest]) > 0
        ) {
          largest = right;
        }
        if (largest === parent) break;
        [active[parent], active[largest]] = [active[largest], active[parent]];
        parent = largest;
      }
    }
    return top;
  };

  let total = 0;
  let eventIndex = 0;
  while (eventIndex < events.length) {
    const time = events[eventIndex].time;
    while (eventIndex < events.length && events[eventIndex].time === time) {
      const event = events[eventIndex];
      if (event.kind === "start") pushActive(event.index);
      eventIndex += 1;
    }

    while (active.length > 0 && valid[active[0]].end <= time) {
      popActive();
    }

    const nextTime = events[eventIndex]?.time;
    if (nextTime !== undefined && active.length > 0) {
      total += rates[active[0]] * (nextTime - time);
    }
  }

  return total;
}

function finalizeState(state: AccState) {
  const metrics: HealthMetric[] = [];
  const configs: HealthImportConfig[] = [];

  // Resolve sum metrics via interval deduplication
  const sumDayMaps = new Map<string, Map<string, DayBucket>>();
  for (const [slotKey, intervals] of state.sumIntervals) {
    const [key, date] = slotKey.split(":");
    if (!sumDayMaps.has(key)) sumDayMaps.set(key, new Map());
    const deduped = deduplicateIntervals(intervals);
    sumDayMaps.get(key)!.set(date, { sum: deduped, count: 1 });
  }
  for (const [key, dayMap] of sumDayMaps) {
    state.buckets.set(key, dayMap);
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

function parseRecordLine(line: string): RawRecord | null {
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
