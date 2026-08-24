"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import { HealthChart } from "@/components/dashboard/health-chart";
import { runApi } from "@/lib/effect/client";
import { getCutoffDate, isPeriod } from "@/lib/period";
import type { Period } from "@/lib/period";
import { PERIODS } from "@/lib/period";
import type { HealthData, HealthMetric } from "@/types/health";

type HealthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: HealthData }
  | { kind: "error" };

export function HealthGrid() {
  const searchParams = useSearchParams();
  return <HealthGridContent requestedPeriod={searchParams.get("period")} />;
}

export function HealthGridContent({
  requestedPeriod,
}: {
  requestedPeriod: string | null;
}) {
  const initialPeriod = isPeriod(requestedPeriod) ? requestedPeriod : "6M";
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [state, setState] = useState<HealthState>({ kind: "idle" });
  const section = useRef<HTMLDivElement>(null);
  const currentPeriod = useRef<Period>(initialPeriod);
  const isNearViewport = useRef(false);
  const data = useRef(new Map<Period, HealthData>());
  const requests = useRef(new Map<Period, Promise<HealthData>>());

  const loadPeriod = useCallback((requested: Period) => {
    const cached = data.current.get(requested);
    if (cached) {
      if (currentPeriod.current === requested) {
        setState({ kind: "ready", data: cached });
      }
      return;
    }

    const sixMonths = data.current.get("6M");
    if (requested === "1M" && sixMonths) {
      const cutoff = getCutoffDate("1M");
      const oneMonth = {
        configs: sixMonths.configs,
        metrics: sixMonths.metrics.filter((metric) => metric.date >= cutoff),
      };
      data.current.set(requested, oneMonth);
      if (currentPeriod.current === requested) {
        setState({ kind: "ready", data: oneMonth });
      }
      return;
    }

    if (currentPeriod.current === requested) setState({ kind: "loading" });
    const pending =
      requests.current.get(requested) ??
      runApi((client) =>
        client.dashboard.health({ query: { period: requested } }),
      );
    requests.current.set(requested, pending);
    pending
      .then((result) => {
        data.current.set(requested, result);
        if (currentPeriod.current === requested) {
          setState({ kind: "ready", data: result });
        }
      })
      .catch(() => {
        requests.current.delete(requested);
        if (currentPeriod.current === requested) setState({ kind: "error" });
      });
  }, []);

  useEffect(() => {
    const target = section.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        isNearViewport.current = true;
        loadPeriod(currentPeriod.current);
        observer.disconnect();
      },
      { rootMargin: "1000px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadPeriod]);

  useEffect(() => {
    function followBrowserNavigation() {
      const requested = new URL(window.location.href).searchParams.get(
        "period",
      );
      const next = isPeriod(requested) ? requested : "6M";
      if (currentPeriod.current === next) return;

      currentPeriod.current = next;
      setPeriod(next);
      if (isNearViewport.current) loadPeriod(next);
    }

    window.addEventListener("popstate", followBrowserNavigation);
    return () =>
      window.removeEventListener("popstate", followBrowserNavigation);
  }, [loadPeriod]);

  function selectPeriod(next: Period) {
    currentPeriod.current = next;
    setPeriod(next);
    loadPeriod(next);

    const url = new URL(window.location.href);
    if (next === "6M") url.searchParams.delete("period");
    else url.searchParams.set("period", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div ref={section}>
      <div className="mb-4 flex justify-end">
        <nav
          aria-label="Health history period"
          className="flex shrink-0 gap-0.5 rounded-full border border-zinc-900/10 bg-white/75 p-1 text-xs shadow-sm"
        >
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              onPointerDown={(event) => {
                if (event.pointerType !== "touch") loadPeriod(option);
              }}
              onClick={() => selectPeriod(option)}
              aria-pressed={period === option}
              className={`flex min-h-9 min-w-11 items-center justify-center rounded-full px-3 font-semibold ${
                period === option
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {option}
            </button>
          ))}
        </nav>
      </div>
      {state.kind === "ready" ? (
        <HealthCharts data={state.data} />
      ) : state.kind === "error" ? (
        <div className="surface flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-sm text-zinc-600">
          <p>Could not load health trends.</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => loadPeriod(period)}
          >
            Retry
          </button>
        </div>
      ) : (
        <div
          className="surface flex min-h-72 items-center justify-center p-6 text-sm text-zinc-500"
          role="status"
        >
          {state.kind === "loading"
            ? `Loading ${period} health trends…`
            : "Health trends load as you approach this section."}
        </div>
      )}
    </div>
  );
}

function HealthCharts({ data }: { data: HealthData }) {
  const byMetric = useMemo(() => {
    const map = new Map<string, HealthMetric[]>();
    for (const metric of data.metrics) {
      const list = map.get(metric.metric) ?? [];
      list.push(metric);
      map.set(metric.metric, list);
    }
    return map;
  }, [data.metrics]);

  const hasBloodPressure =
    data.configs.some(
      (config) => config.metric === "blood_pressure_systolic",
    ) &&
    data.configs.some((config) => config.metric === "blood_pressure_diastolic");
  const singleConfigs = data.configs.filter(
    (config) =>
      config.metric !== "blood_pressure_systolic" &&
      config.metric !== "blood_pressure_diastolic",
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {hasBloodPressure && (
        <BloodPressureChart
          systolic={byMetric.get("blood_pressure_systolic") ?? []}
          diastolic={byMetric.get("blood_pressure_diastolic") ?? []}
        />
      )}
      {singleConfigs.map((config) => (
        <HealthChart
          key={config.metric}
          label={config.label}
          unit={config.unit}
          data={byMetric.get(config.metric) ?? []}
        />
      ))}
    </div>
  );
}
