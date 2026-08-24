import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { trendEffect, type TrendRouteParams } from "@/lib/effect/workflows";

type TrendRouteContext = { params: Promise<TrendRouteParams> };

export async function GET(_request: Request, { params }: TrendRouteContext) {
  return runRoute(provideAppLayer(trendEffect(params)));
}
