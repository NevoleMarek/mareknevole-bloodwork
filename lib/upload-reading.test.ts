import { describe, expect, it } from "vitest";

import {
  assembleSaveReading,
  mergeResearchEntries,
} from "@/lib/upload-reading";
import type { MappedVariable, ResearchedEntry } from "@/types/wizard";
import type { VocabularyEntry } from "@/types/bloodwork";

const newMapping: MappedVariable = {
  label: "C-Reactive Protein",
  originalValue: 0.8,
  originalUnit: "mg/L",
  vocabularyKey: "crp",
  convertedValue: 0.8,
  convertedUnit: "mg/L",
  isNew: true,
};

const researchedEntry = (
  referenceRange: ResearchedEntry["referenceRange"],
): ResearchedEntry => ({
  vocabularyKey: "crp",
  description: "Measures inflammation.",
  referenceRange,
});

const existingVocabulary: VocabularyEntry = {
  key: "glucose",
  label: "Glucose",
  unit: "mg/dL",
  referenceRange: { min: 70, max: 100 },
  description: null,
  featured: true,
  visible: true,
};

describe("assembleSaveReading", () => {
  it("rejects a new biomarker without a reviewed interval", () => {
    const result = assembleSaveReading({
      date: "2026-08-27",
      source: "panel.pdf",
      mappings: [{ ...newMapping, referenceRange: { min: 0, max: 3 } }],
      researched: [],
      vocabulary: [],
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Cannot save C-Reactive Protein: a reviewed reference interval with finite, ordered bounds is required.",
    });
  });

  it("uses the reviewed interval to derive status and persist new vocabulary", () => {
    const result = assembleSaveReading({
      date: "2026-08-27",
      source: "panel.pdf",
      mappings: [newMapping],
      researched: [researchedEntry({ min: 0, max: 0.5 })],
      vocabulary: [],
    });

    expect(result).toEqual({
      ok: true,
      body: {
        date: "2026-08-27",
        source: "panel.pdf",
        measurements: [
          {
            vocabularyKey: "crp",
            value: 0.8,
            unit: "mg/L",
            status: "high",
          },
        ],
        newVocabulary: [
          {
            key: "crp",
            label: "C-Reactive Protein",
            unit: "mg/L",
            referenceRange: { min: 0, max: 0.5 },
            description: "Measures inflammation.",
            featured: false,
            visible: true,
          },
        ],
      },
    });
  });

  it.each([
    ["reversed", { min: 1, max: 1 }],
    ["reversed", { min: 2, max: 1 }],
    ["nonfinite", { min: Number.NaN, max: 1 }],
    ["nonfinite", { min: 1, max: Number.POSITIVE_INFINITY }],
  ])("rejects %s reviewed intervals", (_kind, referenceRange) => {
    const result = assembleSaveReading({
      date: "2026-08-27",
      source: "panel.pdf",
      mappings: [newMapping],
      researched: [researchedEntry(referenceRange)],
      vocabulary: [],
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      message:
        "Cannot save C-Reactive Protein: a reviewed reference interval with finite, ordered bounds is required.",
    });
  });

  it("rejects an existing vocabulary entry without a valid interval", () => {
    const result = assembleSaveReading({
      date: "2026-08-27",
      source: "panel.pdf",
      mappings: [
        {
          ...newMapping,
          label: "Glucose",
          vocabularyKey: "glucose",
          convertedValue: 90,
          convertedUnit: "mg/dL",
          isNew: false,
        },
      ],
      researched: [],
      vocabulary: [
        {
          ...existingVocabulary,
          referenceRange: { min: 100, max: 70 },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      message:
        "Cannot save Glucose: its vocabulary entry has no valid reference interval.",
    });
  });
});

describe("mergeResearchEntries", () => {
  it("keeps omitted research visible as an interval that needs review", () => {
    expect(
      mergeResearchEntries(
        [newMapping],
        [
          {
            vocabularyKey: "unrelated",
            description: "Not requested by this upload.",
          },
        ],
      ),
    ).toEqual([
      {
        vocabularyKey: "crp",
        description: "",
        referenceRange: undefined,
      },
    ]);
  });
});
