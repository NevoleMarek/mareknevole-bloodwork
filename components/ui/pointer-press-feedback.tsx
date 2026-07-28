"use client";

import { useEffect } from "react";

const pressableSelector = [
  "button",
  "nav a",
  "a.button-primary",
  "a.button-secondary",
  "a.button-quiet",
  'label[class*="cursor-pointer"]',
].join(",");

export function PointerPressFeedback() {
  useEffect(() => {
    let pressed: { element: HTMLElement; pointerId: number } | null = null;

    function clearPress() {
      pressed?.element.removeAttribute("data-pointer-pressed");
      pressed = null;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const element = event.target.closest<HTMLElement>(pressableSelector);
      if (!element) return;
      if (element.matches(":disabled, [aria-disabled='true']")) return;
      if (
        element instanceof HTMLLabelElement &&
        element.control?.matches(":disabled")
      ) {
        return;
      }

      clearPress();
      pressed = { element, pointerId: event.pointerId };
      element.dataset.pointerPressed = "true";
    }

    function handlePointerEnd(event: PointerEvent) {
      if (pressed?.pointerId !== event.pointerId) return;
      clearPress();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerEnd, true);
    window.addEventListener("pointercancel", handlePointerEnd, true);
    window.addEventListener("blur", clearPress);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerEnd, true);
      window.removeEventListener("pointercancel", handlePointerEnd, true);
      window.removeEventListener("blur", clearPress);
      clearPress();
    };
  }, []);

  return null;
}
