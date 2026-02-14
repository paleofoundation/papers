import { describe, expect, it } from "vitest";
import { expandCitationNumbers, findCitationTokens } from "../src/citations";

describe("citation parser", () => {
  it("expands range [2–4]", () => {
    expect(expandCitationNumbers("2–4")).toEqual([2, 3, 4]);
  });

  it("parses comma list (1,2)", () => {
    expect(expandCitationNumbers("1,2")).toEqual([1, 2]);
  });

  it("finds mixed citation tokens", () => {
    const tokens = findCitationTokens("Alpha [1] beta (2,3) gamma [4-5].");
    expect(tokens.map((t) => t.raw)).toEqual(["[1]", "(2,3)", "[4-5]"]);
    expect(tokens[2].values).toEqual([4, 5]);
  });
});
