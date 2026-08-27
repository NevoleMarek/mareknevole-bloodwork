"use client";

import { useCallback, useState } from "react";
import { useRef } from "react";
import {
  AdminErrorState,
  adminErrorMessage,
} from "@/components/admin/admin-error-state";
import { HealthImport } from "@/components/admin/health-import";
import { HealthVisibility } from "@/components/admin/health-visibility";
import { runApi } from "@/lib/effect/client";
import type { HealthMetricConfig } from "@/types/health";

export function HealthAdmin({
  configs: initial,
}: {
  configs: HealthMetricConfig[];
}) {
  const [configs, setConfigs] = useState(initial);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPending = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const data = await runApi((client) => client.health.configs({}));
      setConfigs(data);
    } catch (error) {
      setRefreshError(
        adminErrorMessage(
          error,
          "Could not refresh health settings. Please try again.",
        ),
      );
    } finally {
      refreshPending.current = false;
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-5" aria-busy={isRefreshing}>
      {refreshError && (
        <AdminErrorState
          message={refreshError}
          onRetry={refresh}
          retrying={isRefreshing}
        />
      )}
      <HealthImport onImported={refresh} />
      <HealthVisibility configs={configs} />
    </div>
  );
}
