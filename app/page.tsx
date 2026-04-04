import { getCloudflareContext } from "@opennextjs/cloudflare";

import { ChangelogList } from "@/components/dashboard/changelog-list";
import { HealthGrid } from "@/components/dashboard/health-grid";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SectionNav } from "@/components/dashboard/section-nav";
import { SupplementTable } from "@/components/dashboard/supplement-table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import {
  getActiveSupplements,
  getReadingsWithMeasurements,
  getSupplementChangelog,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";
import type { Status } from "@/types/bloodwork";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const vocabulary = await getVocabulary(db);
  const readings = await getReadingsWithMeasurements(db);
  const supplements = await getActiveSupplements(db);
  const changelog = await getSupplementChangelog(db);
  const { metrics: healthMetrics, configs: healthConfigs } =
    await getVisibleHealthMetrics(db);

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
          status: m.status as Status,
        };
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-8">
      <header className="mb-8 border-b border-zinc-200 pb-8">
        <h1 className="text-4xl font-bold tracking-tight">BLOODWORK</h1>
        <p className="mt-1 text-[10px] tracking-widest text-zinc-400 uppercase">
          Marek Nevole
        </p>
        <div className="mt-8 columns-1 gap-12 text-justify text-[13px] leading-[1.7] text-zinc-500 md:columns-2">
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
        <SectionNav />
      </header>

      <section id="metrics" className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Metrics · {latestDate}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <section id="trends" className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Trends
        </h2>
        <TrendChart
          readings={readings.map((r) => ({
            date: r.date,
            source: r.source,
            measurements: r.measurements,
          }))}
          vocabulary={vocabulary}
        />
      </section>

      <section id="health" className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Health
        </h2>
        <HealthGrid metrics={healthMetrics} configs={healthConfigs} />
      </section>

      <section id="supplements" className="mb-8">
        <h2 className="mb-3 flex items-baseline gap-3">
          <span className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
            Supplement Stack
          </span>
          <span className="text-[10px] text-zinc-500">
            {supplements.length} active
          </span>
        </h2>
        <div className="border border-zinc-200 bg-white p-4 md:p-6">
          <SupplementTable supplements={supplements} />
        </div>
      </section>

      <section id="changelog" className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Changelog
        </h2>
        <ChangelogList changelog={changelog} />
      </section>
    </main>
  );
}
