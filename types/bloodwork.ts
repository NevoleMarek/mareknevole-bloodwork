export type VocabularyEntry = {
  key: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
};

export type Vocabulary = { entries: VocabularyEntry[] };

export type Status = "normal" | "borderline" | "high" | "low";

export type Measurement = {
  vocabularyKey: string;
  value: number;
  unit: string;
  status: Status;
};

export type BloodworkReading = {
  date: string;
  source: string;
  measurements: Measurement[];
};

// Agent 1 output: raw extraction from PDF
export type ExtractedMeasurement = {
  label: string;
  value: number;
  unit: string;
  referenceRangeMin: number | null;
  referenceRangeMax: number | null;
  status: Status;
};

export type ExtractedReading = {
  date: string;
  measurements: ExtractedMeasurement[];
};

// Agent 2 output: vocabulary merge result
export type MergeResult = {
  newVocabularyEntries: VocabularyEntry[];
  normalizedMeasurements: Measurement[];
  date: string;
};

export type Supplement = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  startedAt: string;
  stoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplementChangelog = {
  id: string;
  date: string;
  description: string;
  createdAt: string;
};
