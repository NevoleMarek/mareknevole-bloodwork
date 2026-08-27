import { connection } from "next/server";
import * as Effect from "effect/Effect";

import { ChangelogList } from "@/components/dashboard/changelog-list";
import { HealthGrid } from "@/components/dashboard/health-grid";
import { MetricsSection } from "@/components/dashboard/metrics-section";
import { SectionNav } from "@/components/dashboard/section-nav";
import { SupplementTable } from "@/components/dashboard/supplement-table";
import { provideAppLayer, runAppEffect } from "@/lib/effect/run";
import { Dashboard } from "@/lib/effect/services";
import { personalTrackingDisclaimer } from "@/lib/site-metadata";

export default async function Home() {
  await connection();

  const { vocabulary, labs, supplements } = await runAppEffect(
    provideAppLayer(
      Effect.gen(function* () {
        const dashboard = yield* Dashboard;
        return yield* dashboard.getDashboard();
      }),
    ),
  );

  const latest = labs.latestPanel;
  const latestDate = latest
    ? new Date(latest.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const allMetrics = vocabulary
    .filter((e) => e.visible)
    .flatMap((entry) => {
      const measurement = labs.latestMeasurements.find(
        (candidate) => candidate.vocabularyKey === entry.key,
      );
      if (!measurement) return [];
      return [
        {
          vocabularyKey: measurement.vocabularyKey,
          label: entry.label,
          value: measurement.value,
          unit: measurement.unit,
          min: entry.referenceRange.min,
          max: entry.referenceRange.max,
          status: measurement.status,
        },
      ];
    });

  const featured = allMetrics.filter((m) => {
    const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
    return entry?.featured;
  });
  const nonFeatured = allMetrics.filter((m) => {
    const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
    return !entry?.featured;
  });

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1180px] px-4 pt-4 pb-16 sm:px-6 md:pt-6 lg:px-8 lg:pb-24"
    >
      <header className="surface-elevated relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-11">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-20 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Personal health record</p>
              <p className="mt-1 text-sm font-semibold tracking-[-0.01em] text-zinc-700">
                BLOODWORK
              </p>
            </div>
            <a
              href="https://mareknevole.com"
              className="hero-owner-link button-secondary gap-1.5"
            >
              Marek Nevole <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-[clamp(2.8rem,7vw,5.8rem)] leading-[0.94] font-semibold tracking-[-0.065em] text-zinc-950">
                Health,
                <br />
                in context.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                A living record of lab results, daily health signals, and the
                decisions connecting them.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/70 bg-white/68 p-2 shadow-sm backdrop-blur-xl">
              <div className="rounded-2xl bg-white px-4 py-3.5">
                <dt className="text-[0.68rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                  Latest panel
                </dt>
                <dd className="data-value mt-1.5 text-lg font-semibold tracking-tight text-zinc-950">
                  {latestDate || "No data"}
                </dd>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3.5">
                <dt className="text-[0.68rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                  Biomarkers
                </dt>
                <dd className="data-value mt-1.5 text-lg font-semibold tracking-tight text-zinc-950">
                  {allMetrics.length}
                </dd>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3.5">
                <dt className="text-[0.68rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                  Lab panels
                </dt>
                <dd className="data-value mt-1.5 text-lg font-semibold tracking-tight text-zinc-950">
                  {labs.panelCount}
                </dd>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3.5">
                <dt className="text-[0.68rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                  Active stack
                </dt>
                <dd className="data-value mt-1.5 text-lg font-semibold tracking-tight text-zinc-950">
                  {supplements.length}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-12 grid gap-5 border-t border-zinc-900/8 pt-7 text-[0.9rem] leading-7 text-zinc-600 md:grid-cols-2 md:gap-10">
            <p>
              This dashboard exists because better decisions come from better
              data, and better data starts with putting everything in one place,
              structured and accessible. When consistently collecting the data,
              the patterns become impossible to ignore. In an age where language
              models can reason over years of personal data, every month of
              structured collection is an investment that compounds into
              sharper, earlier, more informed decisions.
            </p>
            <p>
              It&apos;s public because the upside is shared. If seeing this
              inspires you to take your own measurements more seriously, or to
              build something like it, then openness costs nothing and creates
              something. We obsess over data collection in professional settings
              because it works. There&apos;s no reason not to apply that same
              discipline to the thing that matters most.
            </p>
          </div>
        </div>
      </header>

      <SectionNav />

      <section id="metrics" className="scroll-mt-32 pt-16">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Latest measurements</p>
            <h2 className="mt-2">Blood markers</h2>
          </div>
          <p>{latestDate}</p>
        </div>
        <MetricsSection
          featured={featured}
          nonFeatured={nonFeatured}
          vocabulary={vocabulary}
        />
      </section>

      <section id="health" className="scroll-mt-32 pt-20">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Daily signals</p>
            <h2 className="mt-2">Health trends</h2>
          </div>
          <p>Context beyond a single lab result.</p>
        </div>
        <HealthGrid />
      </section>

      <section id="supplements" className="scroll-mt-32 pt-20">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current protocol</p>
            <h2 className="mt-2">Supplement stack</h2>
          </div>
          <p>{supplements.length} active</p>
        </div>
        <div className="surface p-4 sm:p-6">
          <SupplementTable supplements={supplements} />
        </div>
      </section>

      <section id="changelog" className="scroll-mt-32 pt-20">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Protocol history</p>
            <h2 className="mt-2">Changelog</h2>
          </div>
          <p>A record of what changed, and when.</p>
        </div>
        <div className="surface p-5 sm:p-7">
          <ChangelogList />
        </div>
      </section>

      <footer className="mt-20 flex flex-col gap-2 border-t border-zinc-900/8 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>{personalTrackingDisclaimer}</p>
        <p>Built and maintained by Marek Nevole.</p>
      </footer>
    </main>
  );
}
