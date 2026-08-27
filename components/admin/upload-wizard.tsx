"use client";

import { useCallback, useRef, useState } from "react";
import type { VocabularyEntry } from "@/types/bloodwork";
import type {
  ExtractedVariable,
  MappedVariable,
  ResearchedEntry,
  SaveReadingRequest,
  WizardState,
} from "@/types/wizard";
import { deriveStatus } from "@/lib/status";
import { adminErrorMessage } from "@/components/admin/admin-error-state";
import { runApi } from "@/lib/effect/client";

import { StepUpload } from "@/components/admin/step-upload";
import { StepReviewExtraction } from "@/components/admin/step-review-extraction";
import { StepReviewMapping } from "@/components/admin/step-review-mapping";
import { StepReviewResearch } from "@/components/admin/step-review-research";

function StepIndicator({
  active,
  hasNewEntries,
}: {
  active: number;
  hasNewEntries: boolean;
}) {
  const labels = hasNewEntries
    ? ["Extract", "Map", "Research"]
    : ["Extract", "Map"];
  return (
    <ol aria-label="Import progress" className="mb-6 flex flex-wrap gap-2">
      {labels.map((label, i) => (
        <li
          key={label}
          aria-current={i === active ? "step" : undefined}
          className={`flex min-h-9 items-center rounded-full px-3 text-xs font-semibold ${
            i === active
              ? "bg-emerald-700 text-white"
              : i < active
                ? "bg-emerald-50 text-emerald-800"
                : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

export function UploadWizard() {
  const [state, setState] = useState<WizardState>({ step: "upload" });
  const [fileName, setFileName] = useState("");
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const vocabularyRequest = useRef<Promise<VocabularyEntry[]> | null>(null);

  const loadVocabulary = useCallback(() => {
    if (!vocabularyRequest.current) {
      vocabularyRequest.current = (async () => {
        try {
          const data = await runApi((client) => client.vocabulary.list({}));
          setVocabulary(data.entries);
          return data.entries;
        } catch (error) {
          vocabularyRequest.current = null;
          throw error;
        }
      })();
    }
    return vocabularyRequest.current;
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      void loadVocabulary().catch(() => {});
      const pdfUrl = URL.createObjectURL(file);
      setFileName(file.name);
      setState({ step: "extracting", pdfUrl });

      const formData = new FormData();
      formData.append("pdf", file);

      try {
        const data = await runApi((client) =>
          client.import.extract({ payload: formData }),
        );
        setState({
          step: "review-extraction",
          pdfUrl,
          date: data.date,
          variables: data.variables,
        });
      } catch (e) {
        setState({
          step: "error",
          message: adminErrorMessage(
            e,
            "Extraction failed. Please try again with this PDF.",
          ),
          returnTo: { step: "upload" },
        });
      }
    },
    [loadVocabulary],
  );

  const handleMap = useCallback(
    async (date: string, variables: ExtractedVariable[], pdfUrl: string) => {
      setState({ step: "mapping", pdfUrl, date, variables });

      try {
        const entries = await loadVocabulary();
        const data = await runApi((client) =>
          client.import.map({
            payload: { variables, vocabulary: entries },
          }),
        );
        setState({
          step: "review-mapping",
          pdfUrl,
          date,
          mappings: data.mappings,
        });
      } catch (e) {
        setState({
          step: "error",
          message: adminErrorMessage(e, "Mapping failed. Please try again."),
          returnTo: { step: "review-extraction", pdfUrl, date, variables },
        });
      }
    },
    [loadVocabulary],
  );

  const handleSave = useCallback(
    async (
      date: string,
      mappings: MappedVariable[],
      researched: ResearchedEntry[],
      pdfUrl: string,
    ) => {
      setState({ step: "saving", pdfUrl, date, mappings });

      const researchByKey = new Map(
        researched.map((r) => [r.vocabularyKey, r]),
      );

      const newVocabulary: VocabularyEntry[] = mappings
        .filter((m) => m.isNew)
        .map((m) => {
          const research = researchByKey.get(m.vocabularyKey);
          return {
            key: m.vocabularyKey,
            label: m.label,
            unit: m.convertedUnit,
            referenceRange: research?.referenceRange ??
              m.referenceRange ?? { min: 0, max: 0 },
            description: research?.description ?? null,
            featured: false,
            visible: true,
          };
        });

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
        await runApi((client) => client.readings.create({ payload: body }));
        setState({ step: "done" });
      } catch (e) {
        setState({
          step: "error",
          message: adminErrorMessage(e, "Save failed. Please try again."),
          returnTo: { step: "review-mapping", pdfUrl, date, mappings },
        });
      }
    },
    [fileName, vocabulary],
  );

  const handleResearch = useCallback(
    async (date: string, mappings: MappedVariable[], pdfUrl: string) => {
      const newEntries = mappings
        .filter((m) => m.isNew)
        .map((m) => ({
          vocabularyKey: m.vocabularyKey,
          label: m.label,
          unit: m.convertedUnit,
          referenceRange: m.referenceRange ?? { min: 0, max: 0 },
        }));

      if (newEntries.length === 0) {
        return handleSave(date, mappings, [], pdfUrl);
      }

      setState({ step: "researching", pdfUrl, date, mappings });

      try {
        const data = await runApi((client) =>
          client.import.research({ payload: { newEntries } }),
        );
        setState({
          step: "review-research",
          pdfUrl,
          date,
          mappings,
          researched: data.entries,
        });
      } catch (e) {
        setState({
          step: "error",
          message: adminErrorMessage(e, "Research failed. Please try again."),
          returnTo: { step: "review-mapping", pdfUrl, date, mappings },
        });
      }
    },
    [handleSave],
  );

  // Determine if we should show PDF preview
  const pdfUrl =
    state.step !== "upload" && state.step !== "done" && state.step !== "error"
      ? state.pdfUrl
      : state.step === "error" && "pdfUrl" in state.returnTo
        ? state.returnTo.pdfUrl
        : null;

  const hasNewEntries =
    (state.step === "review-mapping" ||
      state.step === "researching" ||
      state.step === "review-research" ||
      state.step === "saving") &&
    "mappings" in state &&
    state.mappings.some((m) => m.isNew);

  return (
    <div className={`grid gap-6 ${pdfUrl ? "md:grid-cols-2" : ""}`}>
      {/* Left panel */}
      <div className="min-w-0">
        <div
          key={state.step}
          aria-busy={
            state.step === "extracting" ||
            state.step === "mapping" ||
            state.step === "researching" ||
            state.step === "saving"
          }
          className="admin-state-shell"
        >
          {state.step === "upload" && <StepUpload onUpload={handleUpload} />}

          {state.step === "extracting" && (
            <p role="status" className="text-sm text-zinc-600">
              Extracting variables from PDF…
            </p>
          )}

          {state.step === "review-extraction" && (
            <>
              <StepIndicator active={0} hasNewEntries={false} />
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
              <StepIndicator active={1} hasNewEntries={hasNewEntries} />
              <p role="status" className="text-sm text-zinc-600">
                Mapping variables to vocabulary…
              </p>
            </>
          )}

          {state.step === "review-mapping" && (
            <>
              <StepIndicator active={1} hasNewEntries={hasNewEntries} />
              <StepReviewMapping
                mappings={state.mappings}
                vocabulary={vocabulary}
                onMappingsChange={(mappings) =>
                  setState({ ...state, mappings })
                }
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
                  handleResearch(state.date, state.mappings, state.pdfUrl)
                }
                saving={false}
              />
            </>
          )}

          {state.step === "researching" && (
            <>
              <StepIndicator active={2} hasNewEntries={true} />
              <p role="status" className="text-sm text-zinc-600">
                Researching new biomarkers…
              </p>
            </>
          )}

          {state.step === "review-research" && (
            <>
              <StepIndicator active={2} hasNewEntries={true} />
              <StepReviewResearch
                researched={state.researched}
                onResearchedChange={(researched) =>
                  setState({ ...state, researched })
                }
                onBack={() =>
                  setState({
                    step: "review-mapping",
                    pdfUrl: state.pdfUrl,
                    date: state.date,
                    mappings: state.mappings,
                  })
                }
                onSave={() =>
                  handleSave(
                    state.date,
                    state.mappings,
                    state.researched,
                    state.pdfUrl,
                  )
                }
                saving={false}
              />
            </>
          )}

          {state.step === "saving" && (
            <>
              <StepIndicator
                active={hasNewEntries ? 2 : 1}
                hasNewEntries={hasNewEntries}
              />
              <p role="status" className="text-sm text-zinc-600">
                Saving reading…
              </p>
            </>
          )}

          {state.step === "done" && (
            <div
              role="status"
              className="rounded-2xl bg-emerald-50 p-6 text-center"
            >
              <p className="mb-4 text-sm font-medium text-emerald-900">
                Reading saved successfully.
              </p>
              <button
                type="button"
                onClick={() => setState({ step: "upload" })}
                className="button-primary"
              >
                Upload Another
              </button>
            </div>
          )}

          {state.step === "error" && (
            <div className="rounded-2xl bg-red-50 p-5">
              <p role="alert" className="mb-4 text-sm text-red-800">
                {state.message}
              </p>
              <button
                type="button"
                onClick={() => setState(state.returnTo)}
                className="button-secondary"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: PDF preview (desktop only) */}
      {pdfUrl && (
        <div key={pdfUrl} className="admin-pdf-preview min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-800">PDF preview</h2>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="button-secondary min-h-9 px-3 text-xs"
            >
              Open PDF <span aria-hidden="true">↗</span>
            </a>
          </div>
          <iframe
            src={pdfUrl}
            className="hidden h-[600px] w-full rounded-2xl border border-zinc-900/10 bg-white md:block"
            title="PDF preview"
          />
        </div>
      )}
    </div>
  );
}
