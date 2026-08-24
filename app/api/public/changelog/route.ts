import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { changelogEffect } from "@/lib/effect/workflows";

export async function GET(request: Request) {
  return runRoute(provideAppLayer(changelogEffect(request)));
}
