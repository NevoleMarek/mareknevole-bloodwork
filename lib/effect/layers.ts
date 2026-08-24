import * as Layer from "effect/Layer";

import { layer as runtimeLayer } from "@/lib/effect/runtime";
import { layer as configLayer } from "@/lib/effect/config";
import { layer as repositoryLayer } from "@/lib/effect/repository";
import { layer as providerLayer } from "@/lib/effect/provider";
import { layer as cacheLayer } from "@/lib/effect/cache";
import {
  authLayer,
  bloodworkLayer,
  dashboardLayer,
  healthLayer,
  providerWorkflowsLayer,
  supplementsLayer,
} from "@/lib/effect/services";

// Dependencies are named and topologically composed so required runtime
// authority is visible at the application boundary.
const configLive = configLayer.pipe(Layer.provide(runtimeLayer));
const repositoryLive = repositoryLayer.pipe(Layer.provide(runtimeLayer));
const providerLive = providerLayer.pipe(Layer.provide(configLive));
const dashboardDependencies = Layer.mergeAll(repositoryLive, cacheLayer);
const dashboardLive = dashboardLayer.pipe(Layer.provide(dashboardDependencies));
const bloodworkLive = bloodworkLayer.pipe(
  Layer.provide(Layer.mergeAll(repositoryLive, cacheLayer)),
);
const healthLive = healthLayer.pipe(
  Layer.provide(Layer.mergeAll(repositoryLive, cacheLayer)),
);
const supplementsLive = supplementsLayer.pipe(
  Layer.provide(Layer.mergeAll(repositoryLive, cacheLayer)),
);
const authLive = authLayer.pipe(Layer.provide(configLive));
const providerWorkflowsLive = providerWorkflowsLayer.pipe(
  Layer.provide(providerLive),
);

export const appLayer = Layer.mergeAll(
  dashboardLive,
  bloodworkLive,
  healthLive,
  supplementsLive,
  authLive,
  providerWorkflowsLive,
);
