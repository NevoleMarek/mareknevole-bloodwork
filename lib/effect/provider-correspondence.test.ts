import { describe, expect, it } from "vitest";

import {
  deriveVocabularyKey,
  validateMapRequest,
  validateMapResponse,
  validateResearchRequest,
  validateResearchResponse,
} from "@/lib/effect/provider-correspondence";
import type {
  MapRequest,
  MapResponse,
  ResearchRequest,
  ResearchResponse,
} from "@/lib/schemas/wire";
import type { VocabularyEntry } from "@/lib/schemas/domain";

const glucose: VocabularyEntry = {
  key: "glucose",
  label: "Glucose",
  unit: "mg/dL",
  referenceRange: { min: 70, max: 100 },
  description: "Blood sugar.",
  featured: true,
  visible: true,
};

const mapRequest: MapRequest = {
  variables: [
    { label: "Glucose", value: 5.5, unit: "mmol/L" },
    { label: "CRP", value: 0.8, unit: "mg/L" },
  ],
  vocabulary: [glucose],
};

const validMapping: MapResponse = {
  mappings: [
    {
      label: "Glucose",
      originalValue: 5.5,
      originalUnit: "mmol/L",
      vocabularyKey: "glucose",
      convertedValue: 99,
      convertedUnit: "mg/dL",
      isNew: false,
    },
    {
      label: "CRP",
      originalValue: 0.8,
      originalUnit: "mg/L",
      vocabularyKey: "crp",
      convertedValue: 0.8,
      convertedUnit: "mg/L",
      isNew: true,
      referenceRange: { min: 0, max: 3 },
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

const validResearch: ResearchResponse = {
  entries: [
    {
      vocabularyKey: "crp",
      description: "Measures inflammation in the body.",
      referenceRange: { min: 0, max: 3 },
    },
    {
      vocabularyKey: "ferritin",
      description: "Measures stored iron in the body.",
      referenceRange: { min: 20, max: 250 },
    },
  ],
};

describe("provider correspondence validation", () => {
  it("requires exactly one ordered mapping for each extracted variable", () => {
    expect(validateMapResponse(mapRequest, validMapping)).toMatchObject({
      ok: true,
    });
    expect(
      validateMapResponse(mapRequest, {
        mappings: [validMapping.mappings[0]],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          validMapping.mappings[0],
          validMapping.mappings[1],
          validMapping.mappings[1],
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateMapResponse(mapRequest, {
        mappings: [validMapping.mappings[1], validMapping.mappings[0]],
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects rewritten inputs, unsupported keys, and invalid conversions", () => {
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          { ...validMapping.mappings[0], originalValue: 99 },
          validMapping.mappings[1],
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          { ...validMapping.mappings[0], vocabularyKey: "ldl" },
          validMapping.mappings[1],
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          { ...validMapping.mappings[0], convertedValue: 999 },
          validMapping.mappings[1],
        ],
      }),
    ).toMatchObject({ ok: false });
  });

  it("requires reviewed fields for new mappings", () => {
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          validMapping.mappings[0],
          { ...validMapping.mappings[1], referenceRange: undefined },
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          validMapping.mappings[0],
          {
            ...validMapping.mappings[1],
            referenceRange: { min: 3, max: 3 },
          },
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          validMapping.mappings[0],
          { ...validMapping.mappings[1], isNew: false },
        ],
      }),
    ).toMatchObject({ ok: false });
  });

  it("requires exact, unique research keys and valid review fields", () => {
    expect(validateResearchRequest(researchRequest)).toMatchObject({
      ok: true,
    });
    expect(
      validateResearchResponse(researchRequest, validResearch),
    ).toMatchObject({ ok: true });
    expect(
      validateResearchResponse(researchRequest, {
        entries: [validResearch.entries[0]],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateResearchResponse(researchRequest, {
        entries: [validResearch.entries[1], validResearch.entries[0]],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateResearchResponse(researchRequest, {
        entries: [
          validResearch.entries[0],
          { ...validResearch.entries[1], vocabularyKey: "unknown" },
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateResearchResponse(researchRequest, {
        entries: [
          validResearch.entries[0],
          { ...validResearch.entries[1], description: "" },
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateResearchResponse(researchRequest, {
        entries: [
          validResearch.entries[0],
          {
            ...validResearch.entries[1],
            referenceRange: { min: 250, max: 20 },
          },
        ],
      }),
    ).toMatchObject({ ok: false });
  });

  it("does not accept duplicate input identities or unstable new keys", () => {
    expect(
      validateMapRequest({
        ...mapRequest,
        variables: [mapRequest.variables[0], mapRequest.variables[0]],
      }),
    ).toMatchObject({ ok: false });
    expect(deriveVocabularyKey("CRP")).toBe("crp");
    expect(deriveVocabularyKey("  ")).toBeUndefined();
    expect(
      validateMapResponse(mapRequest, {
        mappings: [
          validMapping.mappings[0],
          { ...validMapping.mappings[1], vocabularyKey: "other_key" },
        ],
      }),
    ).toMatchObject({ ok: false });
  });
});
