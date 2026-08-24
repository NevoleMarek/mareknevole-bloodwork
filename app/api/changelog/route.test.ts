import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { runRoute } from "@/lib/effect/http";
import { Supplements } from "@/lib/effect/services";
import { updateChangelogEffect } from "@/lib/effect/workflows";
import type { ChangelogUpdateRequest } from "@/lib/schemas/wire";

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

const runUpdate = (request: Request, service: Supplements["Service"]) =>
  runRoute(
    updateChangelogEffect(request).pipe(
      Effect.provide(Layer.succeed(Supplements, service)),
    ),
  );

const request = (body: ChangelogUpdateRequest) =>
  new Request("https://bloodwork.test/api/changelog", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

describe("changelog update Effect route workflow", () => {
  it.each([
    ["id", { id: "", description: "updated" }],
    ["description", { id: "entry-1", description: "" }],
  ])("rejects an empty %s with a typed 400 response", async (_field, body) => {
    const response = await runUpdate(
      request(body),
      supplements(() => Effect.die("update must not be called")),
    );

    expect(response.status).toBe(400);
  });

  it("passes a valid non-empty update to Supplements", async () => {
    let receivedId: string | undefined;
    let receivedDescription: string | undefined;
    const response = await runUpdate(
      request({ id: "entry-1", description: "updated" }),
      supplements((id, description) => {
        receivedId = id;
        receivedDescription = description;
        return Effect.succeed(undefined);
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(receivedId).toBe("entry-1");
    expect(receivedDescription).toBe("updated");
  });
});
