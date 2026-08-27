import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runApi } from "@/lib/effect/client";
import { UploadWizard } from "@/components/admin/upload-wizard";

const vocabulary = {
  entries: [
    {
      key: "glucose",
      label: "Glucose",
      unit: "mmol/L",
      referenceRange: { min: 3.9, max: 5.5 },
      description: null,
      featured: true,
      visible: true,
    },
  ],
};

const extraction = {
  date: "2026-08-24",
  variables: [{ label: "Glucose", value: 5.1, unit: "mmol/L" }],
};

const mapping = {
  mappings: [
    {
      label: "Glucose",
      originalValue: 5.1,
      originalUnit: "mmol/L",
      vocabularyKey: "glucose",
      convertedValue: 5.1,
      convertedUnit: "mmol/L",
      isNew: false,
      referenceRange: { min: 3.9, max: 5.5 },
    },
  ],
};

function getStepRegion(name: RegExp) {
  return screen.getByRole("region", { name });
}

function getUploadInput() {
  return screen.getByLabelText(/Add a lab report/);
}

function makePdf() {
  return new File(["%PDF-1.7"], "panel.pdf", {
    type: "application/pdf",
  });
}

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:panel");
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeApiRunner(responses: unknown[]): typeof runApi {
  return async <A,>() => {
    if (responses.length === 0) {
      throw new Error("No API response configured");
    }
    const response = responses.shift();
    if (response instanceof Error) throw response;
    // SAFETY: Each test supplies responses in the order of the wizard API calls.
    return response as A;
  };
}

describe("UploadWizard step focus", () => {
  it("moves focus and announces each forward step transition", async () => {
    const user = userEvent.setup();
    const apiRunner = makeApiRunner([vocabulary, extraction, mapping]);

    render(<UploadWizard apiRunner={apiRunner} />);
    await user.upload(getUploadInput(), makePdf());

    const extractionReview = getStepRegion(/Review the extracted variables/);
    await waitFor(() => expect(extractionReview).toHaveFocus());
    expect(extractionReview).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("heading", { name: "Review the extracted variables." }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Next: Map Variables/ }),
    );
    const mappingReview = getStepRegion(/Review the variable mapping/);
    await waitFor(() => expect(mappingReview).toHaveFocus());
    expect(
      screen.getByRole("heading", { name: "Review the variable mapping." }),
    ).toBeInTheDocument();
  });

  it("returns focus to the new extraction step when navigating backward", async () => {
    const user = userEvent.setup();
    const apiRunner = makeApiRunner([vocabulary, extraction, mapping]);

    render(<UploadWizard apiRunner={apiRunner} />);
    await user.upload(getUploadInput(), makePdf());
    await waitFor(() =>
      expect(getStepRegion(/Review the extracted variables/)).toHaveFocus(),
    );

    await user.click(
      screen.getByRole("button", { name: /Next: Map Variables/ }),
    );
    await waitFor(() =>
      expect(getStepRegion(/Review the variable mapping/)).toHaveFocus(),
    );

    await user.click(screen.getByRole("button", { name: /Back/ }));
    await waitFor(() =>
      expect(getStepRegion(/Review the extracted variables/)).toHaveFocus(),
    );
  });

  it("focuses and announces an extraction error, then focuses the retry step", async () => {
    const user = userEvent.setup();
    const responses: unknown[] = [
      vocabulary,
      new Error("The PDF could not be read."),
    ];
    const apiRunner = makeApiRunner(responses);

    render(<UploadWizard apiRunner={apiRunner} />);
    await user.upload(getUploadInput(), makePdf());

    const errorRegion = getStepRegion(/Error: The PDF could not be read/);
    await waitFor(() => expect(errorRegion).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The PDF could not be read.",
    );
    expect(
      screen.getByRole("heading", {
        name: "Error: The PDF could not be read.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(getStepRegion(/Upload a lab report/)).toHaveFocus(),
    );
  });
});
