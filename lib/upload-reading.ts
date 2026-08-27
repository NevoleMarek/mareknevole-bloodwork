import { deriveStatus } from "@/lib/status";
import {
  isValidReferenceRange,
  type ReferenceRange,
} from "@/lib/schemas/domain";
import type { VocabularyEntry } from "@/types/bloodwork";
import type {
  MappedVariable,
  ResearchedEntry,
  SaveReadingRequest,
} from "@/types/wizard";

export type SaveReadingAssemblyInput = {
  readonly date: string;
  readonly source: string;
  readonly mappings: ReadonlyArray<MappedVariable>;
  readonly researched: ReadonlyArray<ResearchedEntry>;
  readonly vocabulary: ReadonlyArray<VocabularyEntry>;
};

export type SaveReadingAssembly =
  | { readonly ok: true; readonly body: SaveReadingRequest }
  | { readonly ok: false; readonly message: string };

/** Keep every new mapping visible in review, even when research omits it. */
export function mergeResearchEntries(
  mappings: ReadonlyArray<MappedVariable>,
  researched: ReadonlyArray<ResearchedEntry>,
): ResearchedEntry[] {
  const researchedByKey = new Map(
    researched.map((entry) => [entry.vocabularyKey, entry]),
  );
  return mappings
    .filter((mapping) => mapping.isNew)
    .map((mapping) => {
      const entry = researchedByKey.get(mapping.vocabularyKey);
      return (
        entry ?? {
          vocabularyKey: mapping.vocabularyKey,
          description: "",
          referenceRange: undefined,
        }
      );
    });
}

const missingReviewedRangeMessage = (label: string): string =>
  `Cannot save ${label}: a reviewed reference interval with finite, ordered bounds is required.`;

const missingVocabularyRangeMessage = (label: string): string =>
  `Cannot save ${label}: its vocabulary entry has no valid reference interval.`;

/** Assemble a reading only from reviewed, validated intervals. */
export function assembleSaveReading(
  input: SaveReadingAssemblyInput,
): SaveReadingAssembly {
  const researchByKey = new Map(
    input.researched.map((entry) => [entry.vocabularyKey, entry]),
  );
  const newVocabulary: VocabularyEntry[] = [];

  for (const mapping of input.mappings) {
    if (!mapping.isNew) continue;
    const research = researchByKey.get(mapping.vocabularyKey);
    if (
      research === undefined ||
      !isValidReferenceRange(research.referenceRange)
    ) {
      return {
        ok: false,
        message: missingReviewedRangeMessage(mapping.label),
      };
    }
    const referenceRange: ReferenceRange = research.referenceRange;
    newVocabulary.push({
      key: mapping.vocabularyKey,
      label: mapping.label,
      unit: mapping.convertedUnit,
      referenceRange,
      description: research.description ?? null,
      featured: false,
      visible: true,
    });
  }

  const allVocabulary = [...input.vocabulary, ...newVocabulary];
  const measurements: SaveReadingRequest["measurements"] = [];

  for (const mapping of input.mappings) {
    const entry = allVocabulary.find(
      (vocabularyEntry) => vocabularyEntry.key === mapping.vocabularyKey,
    );
    if (entry === undefined || !isValidReferenceRange(entry.referenceRange)) {
      return {
        ok: false,
        message: missingVocabularyRangeMessage(mapping.label),
      };
    }
    measurements.push({
      vocabularyKey: mapping.vocabularyKey,
      value: mapping.convertedValue,
      unit: mapping.convertedUnit,
      status: deriveStatus(mapping.convertedValue, entry.referenceRange),
    });
  }

  return {
    ok: true,
    body: {
      date: input.date,
      source: input.source,
      measurements,
      newVocabulary,
    },
  };
}
