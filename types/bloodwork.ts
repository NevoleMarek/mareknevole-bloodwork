export type VocabularyEntry = {
  key: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
  description: string | null;
  featured: boolean;
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
