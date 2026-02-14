import type { BlockSignature } from "./types";

export type SignatureCluster = {
  id: string;
  members: BlockSignature[];
  centroid: BlockSignature;
};

function similarity(a: BlockSignature, b: BlockSignature): number {
  let score = 0;
  if (a.type === b.type) score += 0.4;
  if (a.structure === b.structure) score += 0.2;
  if (a.style === b.style) score += 0.2;
  score += Math.max(0, 0.2 - Math.abs(a.positionBin - b.positionBin) * 0.02);
  return score;
}

export function clusterSignatures(signatures: BlockSignature[], threshold = 0.6): SignatureCluster[] {
  const clusters: SignatureCluster[] = [];

  for (const sig of signatures) {
    const target = clusters.find((c) => similarity(sig, c.centroid) >= threshold);
    if (!target) {
      clusters.push({ id: `cluster-${clusters.length}`, members: [sig], centroid: sig });
      continue;
    }

    target.members.push(sig);
  }

  return clusters;
}
