import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { dataEffect } from "@/lib/effect/workflows";

export async function GET() {
  return runRoute(provideAppLayer(dataEffect));
}
