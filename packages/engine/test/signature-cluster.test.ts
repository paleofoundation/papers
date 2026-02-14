import { describe, expect, it } from "vitest";
import { computeBlockSignatures } from "../src/signature";
import { clusterSignatures } from "../src/cluster";

describe("signatures and clustering", () => {
  it("clusters similar paragraph blocks", () => {
    const signatures = computeBlockSignatures({
      nodes: [
        { id: "a", type: "paragraph", order: 0, styleKey: "Title", text: "Hello" },
        { id: "b", type: "paragraph", order: 1, styleKey: "Title", text: "World" },
        { id: "c", type: "table", order: 2 }
      ],
      edges: []
    });

    const clusters = clusterSignatures(signatures, 0.55);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
  });
});
