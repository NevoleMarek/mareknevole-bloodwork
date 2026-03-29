"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { VocabularyEntry } from "@/types/bloodwork";
import type {
  ExtractResponse,
  ExtractedVariable,
  MapResponse,
  MappedVariable,
  SaveReadingRequest,
  WizardState,
} from "@/types/wizard";
import { deriveStatus } from "@/lib/status";

import { StepUpload } from "@/components/admin/step-upload";
import { StepReviewExtraction } from "@/components/admin/step-review-extraction";
import { StepReviewMapping } from "@/components/admin/step-review-mapping";

const STEP_LABELS = ["Extract", "Map"] as const;

function StepIndicator({ active }: { active: 0 | 1 }) {
  return (
    <div className="mb-6 flex gap-4 text-[9px] tracking-[2px] uppercase">
      {STEP_LABELS.map((label, i) => (
        <span
          key={label}
          className={
            i === active ? "font-semibold text-zinc-900" : "text-zinc-400"
          }
        >
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );
}

export function UploadWizard() {
  const [state, setState] = useState<WizardState>({ step: "upload" });
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const didFetchVocab = useRef(false);

  useEffect(() => {
    if (didFetchVocab.current) return;
    didFetchVocab.current = true;
    fetch("/api/data")
      .then(
        (r) =>
          r.json() as Promise<{ vocabulary: { entries: VocabularyEntry[] } }>,
      )
      .then((data) => setVocabulary(data.vocabulary.entries));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    const pdfUrl = URL.createObjectURL(file);
    setFileName(file.name);
    setState({ step: "extracting", pdfUrl });

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Extraction failed");
      const data = (await res.json()) as ExtractResponse;
      setState({
        step: "review-extraction",
        pdfUrl,
        date: data.date,
        variables: data.variables,
      });
    } catch (e) {
      setState({
        step: "error",
        message: e instanceof Error ? e.message : "Extraction failed",
        returnTo: { step: "upload" },
      });
    }
  }, []);

  const handleMap = useCallback(
    async (date: string, variables: ExtractedVariable[], pdfUrl: string) => {
      setState({ step: "mapping", pdfUrl, date, variables });

      try {
        const res = await fetch("/api/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variables, vocabulary }),
        });
        if (!res.ok) throw new Error("Mapping failed");
        const data = (await res.json()) as MapResponse;
        setState({
          step: "review-mapping",
          pdfUrl,
          date,
          mappings: data.mappings,
        });
      } catch (e) {
        setState({
          step: "error",
          message: e instanceof Error ? e.message : "Mapping failed",
          returnTo: { step: "review-extraction", pdfUrl, date, variables },
        });
      }
    },
    [vocabulary],
  );

  const handleSave = useCallback(
    async (date: string, mappings: MappedVariable[], pdfUrl: string) => {
      setState({ step: "saving", pdfUrl, date, mappings });

      const newVocabulary: VocabularyEntry[] = mappings
        .filter((m) => m.isNew)
        .map((m) => ({
          key: m.vocabularyKey,
          label: m.label,
          unit: m.convertedUnit,
          referenceRange: m.referenceRange ?? { min: 0, max: 0 },
        }));

      // Build measurements with derived status
      const allVocab = [...vocabulary, ...newVocabulary];
      const measurements: SaveReadingRequest["measurements"] = mappings.map(
        (m) => {
          const entry = allVocab.find((v) => v.key === m.vocabularyKey);
          const range = entry?.referenceRange ?? { min: 0, max: 0 };
          return {
            vocabularyKey: m.vocabularyKey,
            value: m.convertedValue,
            unit: m.convertedUnit,
            status: deriveStatus(m.convertedValue, range),
          };
        },
      );

      const body: SaveReadingRequest = {
        date,
        source: fileName,
        measurements,
        newVocabulary,
      };

      try {
        const res = await fetch("/api/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Save failed");
        setState({ step: "done" });
      } catch (e) {
        setState({
          step: "error",
          message: e instanceof Error ? e.message : "Save failed",
          returnTo: { step: "review-mapping", pdfUrl, date, mappings },
        });
      }
    },
    [vocabulary, fileName],
  );

  // Determine if we should show PDF preview
  const pdfUrl =
    state.step !== "upload" && state.step !== "done" && state.step !== "error"
      ? state.pdfUrl
      : state.step === "error" && "pdfUrl" in state.returnTo
        ? (state.returnTo as { pdfUrl: string }).pdfUrl
        : null;

  return (
    <div className="flex gap-0">
      {/* Left panel */}
      <div
        className={`flex-1 ${pdfUrl ? "md:border-r md:border-zinc-200 md:pr-6" : ""}`}
      >
        {state.step === "upload" && <StepUpload onUpload={handleUpload} />}

        {state.step === "extracting" && (
          <p className="text-xs text-zinc-500">
            Extracting variables from PDF...
          </p>
        )}

        {state.step === "review-extraction" && (
          <>
            <StepIndicator active={0} />
            <StepReviewExtraction
              date={state.date}
              variables={state.variables}
              onDateChange={(date) => setState({ ...state, date })}
              onVariablesChange={(variables) =>
                setState({ ...state, variables })
              }
              onNext={() =>
                handleMap(state.date, state.variables, state.pdfUrl)
              }
            />
          </>
        )}

        {state.step === "mapping" && (
          <>
            <StepIndicator active={1} />
            <p className="text-xs text-zinc-500">
              Mapping variables to vocabulary...
            </p>
          </>
        )}

        {state.step === "review-mapping" && (
          <>
            <StepIndicator active={1} />
            <StepReviewMapping
              mappings={state.mappings}
              vocabulary={vocabulary}
              onMappingsChange={(mappings) => setState({ ...state, mappings })}
              onBack={() =>
                setState({
                  step: "review-extraction",
                  pdfUrl: state.pdfUrl,
                  date: state.date,
                  variables: state.mappings.map((m) => ({
                    label: m.label,
                    value: m.originalValue,
                    unit: m.originalUnit,
                  })),
                })
              }
              onSave={() =>
                handleSave(state.date, state.mappings, state.pdfUrl)
              }
              saving={false}
            />
          </>
        )}

        {state.step === "saving" && (
          <>
            <StepIndicator active={1} />
            <p className="text-xs text-zinc-500">Saving reading...</p>
          </>
        )}

        {state.step === "done" && (
          <div className="text-center">
            <p className="mb-4 text-xs text-zinc-500">
              Reading saved successfully.
            </p>
            <button
              type="button"
              onClick={() => setState({ step: "upload" })}
              className="border border-zinc-900 px-4 py-1.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white"
            >
              Upload Another
            </button>
          </div>
        )}

        {state.step === "error" && (
          <div>
            <p className="mb-4 text-xs text-red-400">{state.message}</p>
            <button
              type="button"
              onClick={() => setState(state.returnTo)}
              className="border border-zinc-200 px-4 py-1.5 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Right panel: PDF preview (desktop only) */}
      {pdfUrl && (
        <div className="hidden flex-1 pl-6 md:block">
          <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
            PDF Preview
          </div>
          <iframe
            src={pdfUrl}
            className="h-[600px] w-full border border-zinc-200"
            title="PDF preview"
          />
        </div>
      )}
    </div>
  );
}
