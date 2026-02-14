import type { BlockSignature, DocumentGraph } from "./types";

function normalizeStyle(style?: string): string {
  return (style ?? "NONE").toUpperCase();
}

export function computeBlockSignatures(graph: DocumentGraph): BlockSignature[] {
  const maxOrder = Math.max(1, ...graph.nodes.map((n) => n.order));

  return graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    structure: `${n.type}:${typeof n.meta?.tableIndex === "number" ? "TABLE" : "BLOCK"}`,
    style: normalizeStyle(n.styleKey),
    positionBin: Math.floor((n.order / maxOrder) * 10),
    textLen: (n.text ?? "").length
  }));
}
