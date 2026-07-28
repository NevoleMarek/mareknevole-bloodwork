import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StepUpload } from "@/components/admin/step-upload";

describe("StepUpload", () => {
  it("keeps drag feedback active while moving across child elements", () => {
    render(<StepUpload onUpload={vi.fn()} />);

    const title = screen.getByText("Add a lab report");
    const label = title.closest("label");
    const shell = title.closest(".file-drop-shell");

    expect(label).not.toBeNull();
    expect(shell).toHaveAttribute("data-drag-active", "false");

    fireEvent.dragEnter(label!);
    fireEvent.dragEnter(title);
    fireEvent.dragLeave(title);
    expect(shell).toHaveAttribute("data-drag-active", "true");

    fireEvent.dragLeave(label!);
    expect(shell).toHaveAttribute("data-drag-active", "false");
  });

  it("clears drag feedback and uploads PDFs on drop", () => {
    const onUpload = vi.fn();
    render(<StepUpload onUpload={onUpload} />);

    const title = screen.getByText("Add a lab report");
    const label = title.closest("label");
    const shell = title.closest(".file-drop-shell");
    const file = new File(["pdf"], "panel.pdf", {
      type: "application/pdf",
    });

    fireEvent.dragEnter(label!);
    fireEvent.drop(label!, { dataTransfer: { files: [file] } });

    expect(shell).toHaveAttribute("data-drag-active", "false");
    expect(onUpload).toHaveBeenCalledWith(file);
  });
});
