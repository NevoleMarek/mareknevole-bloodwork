import * as Effect from "effect/Effect";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HealthAdmin } from "@/components/admin/health-admin";
import { authorizedHealthConfigs } from "@/lib/effect/admin-health";
import { sessionSecurity } from "@/lib/effect/api";
import { provideAppLayer, runAppEffect } from "@/lib/effect/run";
import { Auth, Health } from "@/lib/effect/services";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const session = (await cookies()).get(sessionSecurity.key)?.value;
  if (!session) redirect("/admin");

  const configs = await runAppEffect(
    provideAppLayer(
      Effect.gen(function* () {
        const auth = yield* Auth;
        const health = yield* Health;
        return yield* authorizedHealthConfigs(
          session,
          auth.validate,
          health.getConfigs,
          () => redirect("/admin"),
        );
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
