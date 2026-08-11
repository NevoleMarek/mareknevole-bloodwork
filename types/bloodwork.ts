export type VocabularyEntry = {
  key: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
  description: string | null;
  featured: boolean;
  visible: boolean;
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

export type ReadingSummary = {
  id: string;
  date: string;
  source: string;
  measurementCount: number;
};

export type ReadingCursor = Pick<ReadingSummary, "date" | "id">;

export type ReadingPage = {
  entries: ReadingSummary[];
  nextCursor: ReadingCursor | null;
};

export type BiomarkerTrendPoint = {
  date: string;
  value: number;
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

export type ChangelogCursor = Pick<
  SupplementChangelog,
  "date" | "createdAt" | "id"
>;

export type ChangelogPage = {
  entries: SupplementChangelog[];
  nextCursor: ChangelogCursor | null;
};
