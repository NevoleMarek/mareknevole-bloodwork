import type { Status } from "@/types/bloodwork";

export function deriveStatus(
  value: number,
  referenceRange: { min: number; max: number },
): Status {
  if (value < referenceRange.min) return "low";
  if (value > referenceRange.max) return "high";
  return "normal";
}
