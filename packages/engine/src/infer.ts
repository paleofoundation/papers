import { clusterSignatures } from "./cluster";
import { buildDocumentGraph } from "./graph";
import { extractCitationColor, extractParagraphBlocks, parseOpenXml } from "./openxml";
import { computeBlockSignatures } from "./signature";
import type { InferredRegion, LayoutTemplateModel, RegionConstraint } from "./types";

function inferLabel(signatureStyle: string, positionBin: number, textLen: number): string {
  if (positionBin <= 1 && textLen < 220) return "TITLE";
  if (positionBin <= 3 && textLen < 1200) return "ABSTRACT";
  if (signatureStyle.includes("HEADING")) return "SECTION_HEADER";
  return "SECTION_BODY";
}

function quantile90(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * 0.9)];
}

export async function inferLayoutTemplateModel(exampleBuffers: ArrayBuffer[]): Promise<LayoutTemplateModel> {
  if (exampleBuffers.length < 3 || exampleBuffers.length > 5) {
    throw new Error("Provide 3 to 5 style examples");
  }

  const partSets = await Promise.all(exampleBuffers.map((b) => parseOpenXml(b)));
  const signatures = partSets.flatMap((parts) => computeBlockSignatures(buildDocumentGraph(parts)));
  const clusters = clusterSignatures(signatures, 0.62);

  const regions: InferredRegion[] = clusters.map((cluster, idx) => {
    const lens = cluster.members.map((m) => m.textLen);
    const constraint: RegionConstraint = {
      maxCharsP90: Math.max(60, quantile90(lens)),
      maxLinesP90: Math.max(2, Math.ceil(quantile90(lens) / 90)),
      minFontSize: 9
    };

    const c = cluster.centroid;
    const label = inferLabel(c.style, c.positionBin, c.textLen);

    return {
      regionId: `REGION_${idx}`,
      label,
      signatureCentroid: `${c.type}|${c.style}|${c.positionBin}`,
      members: cluster.members.map((m) => m.id),
      constraint
    };
  });

  // medoid: minimal average paragraph count distance
  const paragraphCounts = partSets.map((p) => extractParagraphBlocks(p.documentXml).length);
  let medoidDocIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  paragraphCounts.forEach((count, i) => {
    const dist = paragraphCounts.reduce((acc, c) => acc + Math.abs(c - count), 0);
    if (dist < bestDist) {
      bestDist = dist;
      medoidDocIndex = i;
    }
  });

  const citationColor = extractCitationColor(partSets[medoidDocIndex].stylesXml);

  return { regions, citationColor, medoidDocIndex };
}
