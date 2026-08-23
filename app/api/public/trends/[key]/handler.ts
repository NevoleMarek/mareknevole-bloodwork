import type { BiomarkerTrendPoint } from "@/types/bloodwork";

type TrendRouteDependencies = {
  getTrend: (key: string) => Promise<BiomarkerTrendPoint[]>;
  getVisibleKeys: () => Promise<string[]>;
};

type TrendRouteContext = { params: Promise<{ key: string }> };

export function createTrendHandler(dependencies: TrendRouteDependencies) {
  return async function getTrend(
    _request: Request,
    { params }: TrendRouteContext,
  ) {
    const { key } = await params;
    const visibleKeys = await dependencies.getVisibleKeys();
    if (!visibleKeys.includes(key)) {
      return Response.json({ error: "Unknown biomarker" }, { status: 404 });
    }

    const points = await dependencies.getTrend(key);
    return Response.json({ points });
  };
}
