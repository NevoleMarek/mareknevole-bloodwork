import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import { authorizedHealthConfigs } from "@/lib/effect/admin-health";
import { AuthenticationError } from "@/lib/effect/errors";
import type { AuthContract, HealthContract } from "@/lib/effect/services";
import type { HealthMetricConfig } from "@/lib/schemas/domain";

class RedirectedToAdmin extends Error {
  constructor() {
    super("redirect:/admin");
  }
}

const protectedConfig: HealthMetricConfig = {
  metric: "resting-heart-rate",
  label: "Resting heart rate",
  unit: "bpm",
  aggregation: "avg",
  visible: false,
};

const getConfigs =
  (reads: { count: number }): HealthContract["getConfigs"] =>
  () => {
    reads.count += 1;
    return Effect.succeed([protectedConfig]);
  };

const redirectToAdmin = (): never => {
  throw new RedirectedToAdmin();
};

describe("authorized admin health configs", () => {
  it("denies a forged non-empty cookie before loading protected config", async () => {
    const reads = { count: 0 };
    const validated: string[] = [];
    const validate: AuthContract["validate"] = (token) => {
      validated.push(token);
      return Effect.fail(
        new AuthenticationError({ reason: "invalid-session" }),
      );
    };

    await expect(
      Effect.runPromise(
        authorizedHealthConfigs(
          "forged-session",
          validate,
          getConfigs(reads),
          redirectToAdmin,
        ),
      ),
    ).rejects.toBeInstanceOf(RedirectedToAdmin);

    expect(validated).toEqual(["forged-session"]);
    expect(reads.count).toBe(0);
  });

  it("loads protected config after valid cookie authentication", async () => {
    const reads = { count: 0 };
    const validated: string[] = [];
    const validate: AuthContract["validate"] = (token) => {
      validated.push(token);
      return Effect.succeed(undefined);
    };

    await expect(
      Effect.runPromise(
        authorizedHealthConfigs(
          "valid-session",
          validate,
          getConfigs(reads),
          redirectToAdmin,
        ),
      ),
    ).resolves.toEqual([protectedConfig]);

    expect(validated).toEqual(["valid-session"]);
    expect(reads.count).toBe(1);
  });
});
