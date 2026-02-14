export type NodeType = "paragraph" | "table" | "tableCell" | "section" | "header" | "footer" | "shape";

export type GraphNode = {
  id: string;
  type: NodeType;
  order: number;
  styleKey?: string;
  text?: string;
  meta?: Record<string, string | number | boolean>;
};

export type GraphEdge = {
  from: string;
  to: string;
  kind: "contains" | "next" | "anchoredTo" | "styleRef";
};

export type DocumentGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type BlockSignature = {
  id: string;
  type: NodeType;
  structure: string;
  style: string;
  positionBin: number;
  textLen: number;
};

export type RegionConstraint = {
  maxCharsP90: number;
  maxLinesP90: number;
  minFontSize: number;
  continuationRegion?: string;
};

export type InferredRegion = {
  regionId: string;
  label: string;
  signatureCentroid: string;
  members: string[];
  constraint: RegionConstraint;
};

export type LayoutTemplateModel = {
  regions: InferredRegion[];
  citationColor: string;
  medoidDocIndex: number;
};

export type ParsedContent = {
  title?: string;
  abstract?: string;
  sections: Array<{ heading: string; body: string }>;
  rawText: string;
};

export type GenerateAudit = {
  mappings: Array<{ region: string; source: string; confidence: number }>;
  overflows: Array<{ region: string; truncatedChars: number }>;
  warnings: string[];
  styleSimilarityScore: number;
};
