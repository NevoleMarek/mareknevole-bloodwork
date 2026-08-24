"use client";

import { useCallback, useState } from "react";
import * as Schema from "effect/Schema";

import { HealthImport } from "@/components/admin/health-import";
import { HealthVisibility } from "@/components/admin/health-visibility";
import { HealthMetricConfigsSchema } from "@/lib/domain-schemas";
import type { HealthMetricConfig } from "@/types/health";

export function HealthAdmin({
  configs: initial,
}: {
  configs: HealthMetricConfig[];
}) {
  const [configs, setConfigs] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/health-config");
    const data = Schema.decodeUnknownSync(HealthMetricConfigsSchema)(
      await res.json(),
    );
    setConfigs(data);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <HealthImport onImported={refresh} />
      <HealthVisibility configs={configs} />
    </div>
  );
}
