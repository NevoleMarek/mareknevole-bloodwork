import type { Status, VocabularyEntry } from "@/types/bloodwork";

export type ExtractedVariable = {
  label: string;
  value: number;
  unit: string;
};

export type MappedVariable = {
  label: string;
  originalValue: number;
  originalUnit: string;
  vocabularyKey: string;
  convertedValue: number;
  convertedUnit: string;
  isNew: boolean;
  referenceRange?: { min: number; max: number };
};

// API response types

export type ExtractResponse = {
  date: string;
  variables: ExtractedVariable[];
};

export type MapRequest = {
  variables: ExtractedVariable[];
  vocabulary: VocabularyEntry[];
};

export type MapResponse = {
  mappings: MappedVariable[];
};

export type SaveReadingRequest = {
  date: string;
  source: string;
  measurements: {
    vocabularyKey: string;
    value: number;
    unit: string;
    status: Status;
  }[];
  newVocabulary: VocabularyEntry[];
};

export type SaveReadingResponse = {
  readingId: string;
};

// Wizard state machine

export type WizardState =
  | { step: "upload" }
  | { step: "extracting"; pdfUrl: string }
  | {
      step: "review-extraction";
      pdfUrl: string;
      date: string;
      variables: ExtractedVariable[];
    }
  | {
      step: "mapping";
      pdfUrl: string;
      date: string;
      variables: ExtractedVariable[];
    }
  | {
      step: "review-mapping";
      pdfUrl: string;
      date: string;
      mappings: MappedVariable[];
    }
  | {
      step: "saving";
      pdfUrl: string;
      date: string;
      mappings: MappedVariable[];
    }
  | { step: "done" }
  | {
      step: "error";
      message: string;
      returnTo: Exclude<WizardState, { step: "error" }>;
    };
