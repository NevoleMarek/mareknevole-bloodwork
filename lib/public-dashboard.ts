import type {
  DashboardSnapshot,
  LabOverview,
  PublicVocabularyEntry,
  Supplement,
  VocabularyEntry,
} from "@/lib/schemas/domain";

function toPublicVocabularyEntry(
  entry: VocabularyEntry,
): PublicVocabularyEntry {
  return {
    key: entry.key,
    label: entry.label,
    unit: entry.unit,
    referenceRange: entry.referenceRange,
    description: entry.description,
    featured: entry.featured,
  };
}

export function toPublicDashboardSnapshot(input: {
  readonly vocabulary: readonly VocabularyEntry[];
  readonly labs: LabOverview;
  readonly supplements: readonly Supplement[];
}): DashboardSnapshot {
  return {
    vocabulary: input.vocabulary
      .filter((entry) => entry.visible)
      .map(toPublicVocabularyEntry),
    labs: input.labs,
    supplements: [...input.supplements],
  };
}
