import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PointerPressFeedback } from "@/components/ui/pointer-press-feedback";

function Controls() {
  return (
    <>
      <PointerPressFeedback />
      <button type="button">Save</button>
      <button type="button" disabled>
        Disabled
      </button>
      <nav>
        <a href="/admin">Admin</a>
      </nav>
      <a href="/export" className="button-secondary">
        Export
      </a>
      <label className="block cursor-pointer">
        Upload
        <input type="file" />
      </label>
      <label className="block cursor-pointer">
        Disabled upload
        <input type="file" disabled />
      </label>
    </>
  );
}

function press(element: Element, pointerId: number, pointerType = "mouse") {
  fireEvent.pointerDown(element, {
    button: 0,
    isPrimary: true,
    pointerId,
    pointerType,
  });
}

describe("PointerPressFeedback", () => {
  it.each([
    ["button", () => screen.getByRole("button", { name: "Save" }), "mouse"],
    [
      "navigation link",
      () => screen.getByRole("link", { name: "Admin" }),
      "mouse",
    ],
    [
      "button-styled link",
      () => screen.getByRole("link", { name: "Export" }),
      "touch",
    ],
    ["upload label", () => screen.getByText("Upload"), "touch"],
  ])(
    "sets and clears pointer feedback for a %s",
    (_, getElement, pointerType) => {
      render(<Controls />);
      const element = getElement();

      press(element, 7, pointerType);
      expect(element).toHaveAttribute("data-pointer-pressed", "true");

      fireEvent.pointerUp(window, {
        isPrimary: true,
        pointerId: 7,
        pointerType,
      });
      expect(element).not.toHaveAttribute("data-pointer-pressed");
    },
  );

  it("clears feedback on cancellation and window blur", () => {
    render(<Controls />);
    const button = screen.getByRole("button", { name: "Save" });

    press(button, 1);
    fireEvent.pointerCancel(window, { isPrimary: true, pointerId: 1 });
    expect(button).not.toHaveAttribute("data-pointer-pressed");

    press(button, 2);
    fireEvent.blur(window);
    expect(button).not.toHaveAttribute("data-pointer-pressed");
  });

  it("reverses rapidly without leaving an earlier target pressed", () => {
    render(<Controls />);
    const button = screen.getByRole("button", { name: "Save" });
    const link = screen.getByRole("link", { name: "Admin" });

    press(button, 1);
    press(link, 2, "touch");
    expect(button).not.toHaveAttribute("data-pointer-pressed");
    expect(link).toHaveAttribute("data-pointer-pressed", "true");

    fireEvent.pointerUp(window, { isPrimary: true, pointerId: 2 });
    expect(link).not.toHaveAttribute("data-pointer-pressed");
  });

  it("ignores keyboard activation, secondary pointers, and disabled controls", () => {
    render(<Controls />);
    const button = screen.getByRole("button", { name: "Save" });
    const disabledButton = screen.getByRole("button", { name: "Disabled" });
    const disabledUpload = screen.getByText("Disabled upload");

    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyUp(button, { key: " " });
    fireEvent.click(button);
    expect(button).not.toHaveAttribute("data-pointer-pressed");

    fireEvent.pointerDown(button, {
      button: 0,
      isPrimary: false,
      pointerId: 2,
      pointerType: "touch",
    });
    press(disabledButton, 3);
    press(disabledUpload, 4, "touch");
    expect(button).not.toHaveAttribute("data-pointer-pressed");
    expect(disabledButton).not.toHaveAttribute("data-pointer-pressed");
    expect(disabledUpload).not.toHaveAttribute("data-pointer-pressed");
  });

  it("clears the active element when the helper unmounts", () => {
    const view = render(<Controls />);
    const button = screen.getByRole("button", { name: "Save" });

    press(button, 1);
    view.unmount();

    expect(button).not.toHaveAttribute("data-pointer-pressed");
  });
});
