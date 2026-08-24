export type {
  ExtractedVariable,
  MappedVariable,
  ResearchedEntry,
} from "@/lib/schemas/domain";
export type {
  MapRequest,
  ResearchRequest,
  SaveReadingRequest,
} from "@/lib/effect/api";

import type {
  ExtractedVariable,
  MappedVariable,
  ResearchedEntry,
} from "@/lib/schemas/domain";

// UI-only state remains intentionally separate from persisted and wire models.
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
      step: "researching";
      pdfUrl: string;
      date: string;
      mappings: MappedVariable[];
    }
  | {
      step: "review-research";
      pdfUrl: string;
      date: string;
      mappings: MappedVariable[];
      researched: ResearchedEntry[];
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
