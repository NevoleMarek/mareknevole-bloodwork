import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { healthEffect } from "@/lib/effect/workflows";

export async function GET(request: Request) {
  return runRoute(provideAppLayer(healthEffect(request)));
}
