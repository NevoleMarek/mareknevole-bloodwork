import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  ReferenceRange,
  ResearchEntry,
  isValidReferenceRange,
} from "@/lib/schemas/domain";
import { ResearchResponse, SaveReadingRequest } from "@/lib/schemas/wire";

describe("ReferenceRange", () => {
  it("accepts finite intervals with ordered bounds", () => {
    expect(isValidReferenceRange({ min: 0, max: 1 })).toBe(true);
    expect(
      Schema.decodeUnknownSync(ReferenceRange)({ min: 0, max: 1 }),
    ).toEqual({ min: 0, max: 1 });
  });

  it.each([
    { min: 1, max: 1 },
    { min: 2, max: 1 },
    { min: Number.NaN, max: 1 },
    { min: 1, max: Number.POSITIVE_INFINITY },
  ])("rejects invalid interval %#", (range) => {
    expect(isValidReferenceRange(range)).toBe(false);
    expect(() => Schema.decodeUnknownSync(ReferenceRange)(range)).toThrow();
  });

  it("allows a research response to honestly omit an interval", () => {
    expect(
      Schema.decodeUnknownSync(ResearchResponse)({
        entries: [
          { vocabularyKey: "crp", description: "Measures inflammation." },
        ],
      }),
    ).toEqual({
      entries: [
        { vocabularyKey: "crp", description: "Measures inflammation." },
      ],
    });
  });

  it("omits an unavailable interval when encoding a research request", () => {
    expect(
      Schema.encodeUnknownSync(ResearchEntry)({
        vocabularyKey: "crp",
        label: "C-Reactive Protein",
        unit: "mg/L",
        referenceRange: undefined,
      }),
    ).toEqual({
      vocabularyKey: "crp",
      label: "C-Reactive Protein",
      unit: "mg/L",
    });
  });

  it("rejects invalid intervals in persisted vocabulary payloads", () => {
    expect(
      Schema.is(SaveReadingRequest)({
        date: "2026-08-27",
        source: "panel.pdf",
        measurements: [],
        newVocabulary: [
          {
            key: "crp",
            label: "C-Reactive Protein",
            unit: "mg/L",
            referenceRange: { min: 2, max: 1 },
            description: null,
            featured: false,
            visible: true,
          },
        ],
      }),
    ).toBe(false);
  });
});
