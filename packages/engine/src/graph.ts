import { countTables, extractParagraphBlocks, type OpenXmlParts } from "./openxml";
import type { DocumentGraph } from "./types";

export function buildDocumentGraph(parts: OpenXmlParts): DocumentGraph {
  const nodes = [] as DocumentGraph["nodes"];
  const edges = [] as DocumentGraph["edges"];

  const paragraphs = extractParagraphBlocks(parts.documentXml);
  paragraphs.forEach((p, i) => {
    const id = `p-${i}`;
    nodes.push({ id, type: "paragraph", order: i, styleKey: p.pStyle, text: p.text, meta: { len: p.text.length } });
    if (i > 0) edges.push({ from: `p-${i - 1}`, to: id, kind: "next" });
  });

  const tableCount = countTables(parts.documentXml);
  for (let i = 0; i < tableCount; i += 1) {
    nodes.push({ id: `tbl-${i}`, type: "table", order: i, meta: { tableIndex: i } });
  }

  parts.headers.forEach((h, idx) => {
    nodes.push({ id: `hdr-${idx}`, type: "header", order: idx, text: extractParagraphBlocks(h.xml).map((p) => p.text).join("\n") });
  });

  parts.footers.forEach((f, idx) => {
    nodes.push({ id: `ftr-${idx}`, type: "footer", order: idx, text: extractParagraphBlocks(f.xml).map((p) => p.text).join("\n") });
  });

  return { nodes, edges };
}
