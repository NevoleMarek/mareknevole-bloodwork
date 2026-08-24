import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { Supplements } from "@/lib/effect/services";
import { updateChangelogEffect } from "@/lib/effect/workflows";

const unused = () => Effect.die("unused supplements operation");

const supplements = (
  updateChangelog: Supplements["Service"]["updateChangelog"],
) =>
  Supplements.of({
    get: unused,
    create: unused,
    update: unused,
    remove: unused,
    updateChangelog,
    deleteChangelog: unused,
  });

describe("changelog update Effect workflow", () => {
  it("passes a decoded update to Supplements", async () => {
    let receivedId: string | undefined;
    let receivedDescription: string | undefined;
    const result = await Effect.runPromise(
      updateChangelogEffect("entry-1", { description: "updated" }).pipe(
        Effect.provide(
          Layer.succeed(
            Supplements,
            supplements((id, description) => {
              receivedId = id;
              receivedDescription = description;
              return Effect.succeed(undefined);
            }),
          ),
        ),
      ),
    );

    expect(result).toBeUndefined();
    expect(receivedId).toBe("entry-1");
    expect(receivedDescription).toBe("updated");
  });
});
