import * as Effect from "effect/Effect";

import { appLayer } from "@/lib/effect/layers";

export const provideAppLayer = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.provide(appLayer));

export const runAppEffect = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
  Effect.runPromise(effect);
