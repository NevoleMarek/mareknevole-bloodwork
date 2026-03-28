import { existsSync, readFileSync } from "node:fs";
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

  const supplementsFile = dataPath("supplements.json");
  const { supplements: allSupplements, changelog } = existsSync(supplementsFile)
    ? loadJson<{ supplements: Supplement[]; changelog: SupplementChangelog[] }>(
        "supplements.json",
      )
    : {
        supplements: [] as Supplement[],
        changelog: [] as SupplementChangelog[],
      };

  const supplements = allSupplements.filter((s) => s.stoppedAt === null);

  const supplementsLastUpdated = allSupplements.reduce((latest, s) => {
    return s.updatedAt > latest ? s.updatedAt : latest;
  }, "");

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
      <header className="mb-8 border-b border-zinc-200 pb-8">
        <h1 className="text-4xl font-bold tracking-tight">BLOODWORK</h1>
        <p className="mt-1 text-[10px] tracking-widest text-zinc-400 uppercase">
          Marek Nevole
        </p>
        <div className="mt-8 columns-2 gap-12 text-justify text-[13px] leading-[1.7] text-zinc-500">
          <p>
            This dashboard exists because better decisions come from better
            data, and better data starts with putting everything in one place,
            structured and accessible. When consistently collecting the data,
            the patterns become impossible to ignore. In an age where language
            models can reason over years of personal data, every month of
            structured collection is an investment that compounds into sharper,
            earlier, more informed decisions.
          </p>
          <p className="mt-4">
            It&apos;s public because the upside is shared. If seeing this
            inspires you to take your own measurements more seriously, or to
            build something like it, then openness costs nothing and creates
            something. We obsess over data collection in professional settings
            because it works. There&apos;s no reason not to apply that same
            discipline to the thing that matters most.
          </p>
        </div>
      </header>

      <section className="mb-8">
        <SupplementStack
          supplements={supplements}
          changelog={changelog}
          lastUpdated={supplementsLastUpdated}
        />
      </section>

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
