import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import {
  ConflictError,
  NotFoundError,
  PersistenceError,
  ProviderRejected,
  RequestDecodeError,
} from "@/lib/effect/errors";
import { decodeJson, responseForError } from "@/lib/effect/http";
import { IdRequest } from "@/lib/schemas/wire";

describe("Effect HTTP boundary", () => {
  it("classifies malformed JSON as a typed request failure", async () => {
    const request = new Request("https://bloodwork.test", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    await expect(
      Effect.runPromise(decodeJson(request, IdRequest, "test.request")),
    ).rejects.toBeInstanceOf(RequestDecodeError);
  });

  it("maps not-found failures without exposing persistence details", () => {
    const response = responseForError(
      new NotFoundError({ resource: "reading", id: "r1" }),
    );
    expect(response?.status).toBe(404);
  });

  it("preserves the public biomarker not-found body", async () => {
    const response = responseForError(
      new NotFoundError({ resource: "biomarker", id: "glucose" }),
    );
    expect(response?.status).toBe(404);
    await expect(response?.json()).resolves.toEqual({
      error: "Unknown biomarker",
    });
  });

  it("maps persistence and upstream status failures truthfully", () => {
    const persistence = responseForError(
      new PersistenceError({ operation: "test.read", cause: new Error("d1") }),
    );
    const upstream = responseForError(
      new ProviderRejected({ operation: "test.provider", status: 429 }),
    );
    expect(persistence?.status).toBe(503);
    expect(upstream?.status).toBe(502);
  });

  it("maps mutation conflicts to 409", () => {
    const response = responseForError(
      new ConflictError({ resource: "vocabulary", id: "glucose" }),
    );
    expect(response?.status).toBe(409);
  });
});
