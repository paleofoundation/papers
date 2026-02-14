export type ConstraintPolicy = {
  maxCharsP90: number;
  maxLinesP90: number;
  minFontSize: number;
  continuationRegion?: string;
};

export type ConstraintOutcome = {
  text: string;
  overflow?: string;
  reducedTo?: number;
};

export function estimateLineCount(text: string): number {
  const lines = text.split("\n").length;
  const heuristic = Math.ceil(text.length / 90);
  return Math.max(lines, heuristic);
}

export function enforceConstraint(text: string, policy: ConstraintPolicy): ConstraintOutcome {
  if (text.length <= policy.maxCharsP90 && estimateLineCount(text) <= policy.maxLinesP90) {
    return { text };
  }

  const clipped = text.slice(0, policy.maxCharsP90);
  return {
    text: clipped,
    overflow: text.slice(policy.maxCharsP90),
    reducedTo: policy.minFontSize
  };
}
