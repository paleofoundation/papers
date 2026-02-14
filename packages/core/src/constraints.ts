import type { RegionConstraint } from "./types";

export type ConstraintResult = {
  text: string;
  overflow?: string;
  appliedFontSize?: number;
};

export function enforceConstraints(text: string, constraint?: RegionConstraint): ConstraintResult {
  if (!constraint) return { text };

  const maxChars = constraint.maxChars ?? Number.MAX_SAFE_INTEGER;
  if (text.length <= maxChars) return { text };

  if (constraint.minFontSize) {
    return {
      text: text.slice(0, maxChars),
      overflow: text.slice(maxChars),
      appliedFontSize: constraint.minFontSize
    };
  }

  return {
    text: text.slice(0, maxChars),
    overflow: text.slice(maxChars)
  };
}
