import * as Effect from "effect/Effect";

import { HealthAdmin } from "@/components/admin/health-admin";
import { provideAppLayer, runAppEffect } from "@/lib/effect/run";
import { Health } from "@/lib/effect/services";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const configs = await runAppEffect(
    provideAppLayer(
      Effect.gen(function* () {
        const health = yield* Health;
        return yield* health.getConfigs();
      }),
    ),
  );

  return (
    <>
      <div className="admin-page-title">
        <p className="eyebrow">Daily signals</p>
        <h1 className="mt-2">Health data</h1>
        <p>Import daily measurements and choose what appears publicly.</p>
      </div>
      <HealthAdmin configs={configs} />
    </>
  );
}
