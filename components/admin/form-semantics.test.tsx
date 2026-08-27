import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SupplementEditor } from "@/components/admin/supplement-editor";
import { VocabularyEditor } from "@/components/admin/vocabulary-editor";
import type { Supplement, VocabularyEntry } from "@/types/bloodwork";

const vocabulary: VocabularyEntry[] = [
  {
    key: "tsh",
    label: "TSH",
    unit: "mIU/L",
    referenceRange: { min: 0.4, max: 4 },
    description: null,
    featured: false,
    visible: true,
  },
];

const supplements: Supplement[] = [
  {
    id: "s1",
    name: "Creatine",
    dose: "5 g",
    frequency: "daily",
    startedAt: "2025-06",
    stoppedAt: null,
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
];

describe("admin editor form semantics", () => {
  it("turns the vocabulary add panel into a named form", async () => {
    const user = userEvent.setup();
    render(<VocabularyEditor entries={vocabulary} onRefresh={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Add entry/ }));

    const form = screen.getByRole("form", {
      name: "Add biomarker vocabulary entry",
    });
    expect(form).toContainElement(screen.getByLabelText("Key"));
    expect(form).toContainElement(screen.getByLabelText("Reference minimum"));
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("names supplement add and edit forms and keeps their controls labelled", async () => {
    const user = userEvent.setup();
    render(<SupplementEditor supplements={supplements} onRefresh={vi.fn()} />);

    const addForm = screen.getByRole("form", { name: "Add supplement" });
    expect(addForm).toContainElement(screen.getByLabelText("Name"));
    expect(addForm).toContainElement(screen.getByLabelText("Changelog date"));

    await user.click(screen.getByRole("button", { name: "Edit Creatine" }));

    const editForm = screen.getByRole("form", { name: "Edit Creatine" });
    expect(editForm).toContainElement(within(editForm).getByLabelText("Dose"));
    expect(editForm).toContainElement(
      within(editForm).getByLabelText("Frequency"),
    );
    expect(editForm).toContainElement(within(editForm).getByLabelText("Since"));
    expect(
      within(editForm).getByRole("button", { name: "Save" }),
    ).toHaveAttribute("type", "submit");
  });
});
