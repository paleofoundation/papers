import { describe, expect, it } from "vitest";
import { enforceConstraint } from "../src/constraints";

describe("constraints", () => {
  it("truncates and returns overflow", () => {
    const out = enforceConstraint("x".repeat(200), { maxCharsP90: 100, maxLinesP90: 2, minFontSize: 9 });
    expect(out.text.length).toBe(100);
    expect(out.overflow?.length).toBe(100);
    expect(out.reducedTo).toBe(9);
  });
});
