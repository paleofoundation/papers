import { describe, expect, it } from "vitest";
import { expandCitationNumbers, findCitationTokens } from "../src/citations";

describe("citations", () => {
  it("expands [2–4]", () => {
    expect(expandCitationNumbers("2–4")).toEqual([2, 3, 4]);
  });

  it("parses comma citations (1,2)", () => {
    expect(expandCitationNumbers("1,2")).toEqual([1, 2]);
  });

  it("detects tokens", () => {
    expect(findCitationTokens("A [1] B (2,3)").map((t) => t.raw)).toEqual(["[1]", "(2,3)"]);
  });
});
