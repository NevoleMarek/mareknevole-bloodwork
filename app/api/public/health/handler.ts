import type { Period } from "@/lib/period";
import { isPeriod } from "@/lib/period";
import type { HealthData } from "@/types/health";

type HealthRouteDependencies = {
  getHealth: (period: Period) => Promise<HealthData>;
};

export function createHealthHandler(dependencies: HealthRouteDependencies) {
  return async function getHealth(request: Request) {
    const value = new URL(request.url).searchParams.get("period");
    if (!isPeriod(value)) {
      return Response.json({ error: "Invalid period" }, { status: 400 });
    }

    return Response.json(await dependencies.getHealth(value));
  };
}
