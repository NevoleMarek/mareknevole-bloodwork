import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  type ApplicationError,
  ProviderDecodeError,
  ValidationError,
} from "@/lib/effect/errors";
import { Gemini } from "@/lib/effect/provider";
import {
  ProviderWorkflows,
  providerWorkflowsLayer,
} from "@/lib/effect/services";
import type {
  MapRequest,
  MapResponse,
  ResearchRequest,
  ResearchResponse,
} from "@/lib/schemas/wire";

const mapRequest: MapRequest = {
  variables: [{ label: "Glucose", value: 5.5, unit: "mmol/L" }],
  vocabulary: [
    {
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      referenceRange: { min: 70, max: 100 },
      description: null,
      featured: true,
      visible: true,
    },
  ],
};

const researchRequest: ResearchRequest = {
  newEntries: [
    {
      vocabularyKey: "crp",
      label: "CRP",
      unit: "mg/L",
      referenceRange: { min: 0, max: 3 },
    },
    {
      vocabularyKey: "ferritin",
      label: "Ferritin",
      unit: "ng/mL",
      referenceRange: { min: 20, max: 250 },
    },
  ],
};

const geminiFor = (response: MapResponse | ResearchResponse) =>
  Layer.succeed(
    Gemini,
    Gemini.of({
      generate: () => Effect.succeed("provider-response"),
      decodeJson: <S extends Schema.Top>(
        schema: S,
        _text: string,
        operation: string,
      ) =>
        Schema.decodeUnknownEffect(schema)(response).pipe(
          Effect.mapError(
            (cause) => new ProviderDecodeError({ operation, cause }),
          ),
        ),
    }),
  );

const runWorkflow = <A>(
  response: MapResponse | ResearchResponse,
  workflow: (
    service: ProviderWorkflows["Service"],
  ) => Effect.Effect<A, ApplicationError>,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* ProviderWorkflows;
      return yield* workflow(service);
    }).pipe(
      Effect.provide(
        providerWorkflowsLayer.pipe(Layer.provide(geminiFor(response))),
      ),
    ),
  );

describe("provider workflow correspondence boundary", () => {
  it("does not return a partial or reordered map to the review UI", async () => {
    await expect(
      runWorkflow({ mappings: [] }, (service) => service.map(mapRequest)),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      runWorkflow(
        {
          mappings: [
            {
              label: "Other",
              originalValue: 5.5,
              originalUnit: "mmol/L",
              vocabularyKey: "glucose",
              convertedValue: 99,
              convertedUnit: "mg/dL",
              isNew: false,
            },
          ],
        },
        (service) => service.map(mapRequest),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("does not return missing, duplicate, or out-of-order research", async () => {
    await expect(
      runWorkflow(
        {
          entries: [
            {
              vocabularyKey: "crp",
              description: "Inflammation marker.",
              referenceRange: { min: 0, max: 3 },
            },
          ],
        },
        (service) => service.research(researchRequest),
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      runWorkflow(
        {
          entries: [
            {
              vocabularyKey: "ferritin",
              description: "Stored iron marker.",
              referenceRange: { min: 20, max: 250 },
            },
            {
              vocabularyKey: "ferritin",
              description: "Duplicate marker.",
              referenceRange: { min: 20, max: 250 },
            },
          ],
        },
        (service) => service.research(researchRequest),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns a canonical value after validating a complete map", async () => {
    await expect(
      runWorkflow(
        {
          mappings: [
            {
              label: "Glucose",
              originalValue: 5.5,
              originalUnit: "mmol/L",
              vocabularyKey: "glucose",
              convertedValue: 99.1,
              convertedUnit: "mg/dL",
              isNew: false,
            },
          ],
        },
        (service) => service.map(mapRequest),
      ),
    ).resolves.toMatchObject({ mappings: [{ convertedValue: 99 }] });
  });
});
