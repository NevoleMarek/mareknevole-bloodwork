import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MetricCard } from "@/components/dashboard/metric-card";
import { SupplementStack } from "@/components/dashboard/supplement-stack";
import { TrendChart } from "@/components/dashboard/trend-chart";
import type {
  BloodworkReading,
  Vocabulary,
  Supplement,
  SupplementChangelog,
} from "@/types/bloodwork";

function dataPath(filename: string) {
  return join(process.cwd(), "data", filename);
}

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(dataPath(filename), "utf-8")) as T;
}

export default function Home() {
  const { entries: vocabulary } = loadJson<Vocabulary>("vocabulary.json");
  const readings = loadJson<BloodworkReading[]>("readings.json");

  // Supplements: empty until DB is wired up
  const supplements: Supplement[] = [];
  const changelog: SupplementChangelog[] = [];

  const latest = readings.at(-1);
  const latestDate = latest
    ? new Date(latest.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const metrics = latest
    ? latest.measurements.map((m) => {
        const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
        if (!entry)
          throw new Error(`Unknown vocabulary key: ${m.vocabularyKey}`);
        return {
          label: entry.label,
          value: m.value,
          unit: m.unit,
          min: entry.referenceRange.min,
          max: entry.referenceRange.max,
          status: m.status,
        };
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-[960px] px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">BLOODWORK</h1>
        <p className="text-[10px] tracking-widest text-zinc-400 uppercase">
          Marek Nevole
        </p>
      </header>

      {supplements.length > 0 && (
        <section className="mb-8">
          <SupplementStack
            supplements={supplements}
            changelog={changelog}
            lastUpdated=""
          />
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Metrics · {latestDate}
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {metrics.map((m) => (
            <MetricCard
              key={m.label}
              label={m.label}
              value={m.value}
              unit={m.unit}
              min={m.min}
              max={m.max}
              status={m.status}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Trends
        </h2>
        <TrendChart readings={readings} vocabulary={vocabulary} />
      </section>
    </main>
  );
}
