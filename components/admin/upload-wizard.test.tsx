import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UploadWizard } from "@/components/admin/upload-wizard";
import { jsonResponse, requestPath } from "@/test/http";

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: Error) => void;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: Error) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function pdfFile(name: string) {
  return new File(["%PDF-1.7"], name, { type: "application/pdf" });
}

function extractionResponse(label: string, date: string) {
  return jsonResponse({
    date,
    variables: [{ label, value: 5.1, unit: "mmol/L" }],
  });
}

function fileInput() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("UploadWizard did not render a file input");
  return input;
}

function stubPreviewUrls() {
  let previewId = 0;
  const createObjectURL = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementation(() => `blob:${previewId++}`);
  const revokeObjectURL = vi
    .spyOn(URL, "revokeObjectURL")
    .mockImplementation(() => {});
  return { createObjectURL, revokeObjectURL };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("UploadWizard", () => {
  it("keeps the latest extraction when an older request resolves later", async () => {
    stubPreviewUrls();
    const firstExtraction = deferred<Response>();
    const secondExtraction = deferred<Response>();
    let extractionCount = 0;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === "/api/vocabulary") {
        return Promise.resolve(jsonResponse({ entries: [] }));
      }
      if (path === "/api/import/extract") {
        extractionCount += 1;
        return extractionCount === 1
          ? firstExtraction.promise
          : secondExtraction.promise;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetch);
    render(<UploadWizard />);

    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("first.pdf")] },
    });
    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("second.pdf")] },
    });
    await vi.waitFor(() => expect(extractionCount).toBe(2));

    await act(async () => {
      secondExtraction.resolve(
        extractionResponse("Second marker", "2026-02-02"),
      );
      await secondExtraction.promise;
    });
    expect(
      await screen.findByDisplayValue("Second marker"),
    ).toBeInTheDocument();

    await act(async () => {
      firstExtraction.resolve(extractionResponse("First marker", "2026-01-01"));
      await firstExtraction.promise;
    });

    expect(screen.getByDisplayValue("Second marker")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("First marker")).toBeNull();
    expect(screen.getByDisplayValue("2026-02-02")).toBeInTheDocument();
  });

  it("ignores a stale extraction error after the current PDF succeeds", async () => {
    stubPreviewUrls();
    const firstExtraction = deferred<Response>();
    const secondExtraction = deferred<Response>();
    let extractionCount = 0;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === "/api/vocabulary") {
        return Promise.resolve(jsonResponse({ entries: [] }));
      }
      if (path === "/api/import/extract") {
        extractionCount += 1;
        return extractionCount === 1
          ? firstExtraction.promise
          : secondExtraction.promise;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetch);
    render(<UploadWizard />);

    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("first.pdf")] },
    });
    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("second.pdf")] },
    });
    await vi.waitFor(() => expect(extractionCount).toBe(2));

    await act(async () => {
      secondExtraction.resolve(
        extractionResponse("Second marker", "2026-02-02"),
      );
      await secondExtraction.promise;
    });
    expect(
      await screen.findByDisplayValue("Second marker"),
    ).toBeInTheDocument();

    await act(async () => {
      firstExtraction.reject(new Error("First extraction failed"));
      await expect(firstExtraction.promise).rejects.toThrow(
        "First extraction failed",
      );
    });

    expect(screen.getByDisplayValue("Second marker")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("saves the current PDF source after stale extraction completes", async () => {
    stubPreviewUrls();
    const firstExtraction = deferred<Response>();
    const secondExtraction = deferred<Response>();
    let extractionCount = 0;
    const savedBodies: unknown[] = [];
    const fetch = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const path = requestPath(input);
        if (path === "/api/vocabulary") {
          return Promise.resolve(jsonResponse({ entries: [] }));
        }
        if (path === "/api/import/extract") {
          extractionCount += 1;
          return extractionCount === 1
            ? firstExtraction.promise
            : secondExtraction.promise;
        }
        if (path === "/api/import/map") {
          return Promise.resolve(
            jsonResponse({
              mappings: [
                {
                  label: "Second marker",
                  originalValue: 5.1,
                  originalUnit: "mmol/L",
                  vocabularyKey: "glucose",
                  convertedValue: 5.1,
                  convertedUnit: "mmol/L",
                  isNew: false,
                },
              ],
            }),
          );
        }
        if (path === "/api/readings") {
          const request =
            input instanceof Request ? input : new Request(input, init);
          return request
            .clone()
            .json()
            .then((body) => {
              savedBodies.push(body);
              return jsonResponse({ readingId: "reading-1" });
            });
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );
    vi.stubGlobal("fetch", fetch);
    render(<UploadWizard />);

    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("first.pdf")] },
    });
    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("second.pdf")] },
    });
    await vi.waitFor(() => expect(extractionCount).toBe(2));

    await act(async () => {
      secondExtraction.resolve(
        extractionResponse("Second marker", "2026-02-02"),
      );
      await secondExtraction.promise;
    });
    expect(
      await screen.findByDisplayValue("Second marker"),
    ).toBeInTheDocument();

    await act(async () => {
      firstExtraction.resolve(extractionResponse("First marker", "2026-01-01"));
      await firstExtraction.promise;
    });
    await screen.findByDisplayValue("Second marker");

    fireEvent.click(
      screen.getByRole("button", { name: /Next: Map Variables/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "Variable Mapping" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Reading" }));

    expect(
      await screen.findByText("Reading saved successfully."),
    ).toBeInTheDocument();
    expect(savedBodies).toEqual([
      expect.objectContaining({ source: "second.pdf" }),
    ]);
  });

  it("revokes replaced and unmounted PDF previews", async () => {
    const { revokeObjectURL } = stubPreviewUrls();
    const extraction = deferred<Response>();
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === "/api/vocabulary") {
        return Promise.resolve(jsonResponse({ entries: [] }));
      }
      if (path === "/api/import/extract") return extraction.promise;
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetch);
    const { unmount } = render(<UploadWizard />);

    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("first.pdf")] },
    });
    fireEvent.change(fileInput(), {
      target: { files: [pdfFile("second.pdf")] },
    });

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:0");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:1");
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
