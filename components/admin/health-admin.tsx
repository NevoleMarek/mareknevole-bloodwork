"use client";

import { useCallback, useState } from "react";
import { HealthImport } from "@/components/admin/health-import";
import { HealthVisibility } from "@/components/admin/health-visibility";
import { decodeResponseJson } from "@/lib/effect/client";
import { HealthMetricConfigs } from "@/lib/schemas/wire";
import type { HealthMetricConfig } from "@/types/health";

export function HealthAdmin({
  configs: initial,
}: {
  configs: HealthMetricConfig[];
}) {
  const [configs, setConfigs] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/health-config");
    const data = await decodeResponseJson(
      res,
      HealthMetricConfigs,
      "admin.health-config",
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
