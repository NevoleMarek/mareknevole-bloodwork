import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HealthImport } from "@/components/admin/health-import";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function healthFile() {
  const file = new File(["{}"], "health-data.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: vi.fn().mockResolvedValue("{}"),
  });
  return file;
}

describe("HealthImport", () => {
  it("keeps nested drag feedback active until the drop target is left", () => {
    render(<HealthImport onImported={vi.fn()} />);

    const title = screen.getByText("Drop health-data.json here");
    const label = title.closest("label");
    const shell = title.closest(".file-drop-shell");

    fireEvent.dragEnter(label!);
    fireEvent.dragEnter(title);
    fireEvent.dragLeave(title);
    expect(shell).toHaveAttribute("data-drag-active", "true");

    fireEvent.dragLeave(label!);
    expect(shell).toHaveAttribute("data-drag-active", "false");
  });

  it("crossfades rapid import states and removes stale layers", async () => {
    vi.useFakeTimers();
    const onImported = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ saved: 12, metrics: 4, days: 3 }),
      }),
    );

    render(<HealthImport onImported={onImported} />);
    const input = screen.getByLabelText(/Drop health-data\.json here/);

    await act(async () => {
      fireEvent.change(input, { target: { files: [healthFile()] } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Imported 4 metrics, 3 days")).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledOnce();
    expect(document.querySelectorAll(".health-import-state").length).toBe(3);
    expect(
      screen
        .getByText("Imported 4 metrics, 3 days")
        .closest(".health-import-state"),
    ).toHaveAttribute("data-phase", "stable");

    act(() => vi.advanceTimersByTime(180));

    const states = document.querySelectorAll(".health-import-state");
    expect(states).toHaveLength(1);
    expect(states[0]).toHaveAttribute("data-state", "success");
    expect(states[0]).toHaveAttribute("data-phase", "stable");
  });

  it("cleans pending transition and reset timers on unmount", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ metrics: 4, days: 3 }),
      }),
    );
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = render(<HealthImport onImported={vi.fn()} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Drop health-data\.json here/), {
        target: { files: [healthFile()] },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("keeps an accessible native file input available after an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Invalid export" }),
      }),
    );
    render(<HealthImport onImported={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Drop health-data\.json here/), {
      target: { files: [healthFile()] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: Invalid export",
    );
    expect(screen.getByLabelText(/Error: Invalid export/)).not.toBeDisabled();
  });
});
