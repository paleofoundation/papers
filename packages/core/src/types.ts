export type SectionBlock = { heading: string; body: string };

export type ParsedContent = {
  title?: string;
  authors?: string;
  affiliations?: string;
  abstract?: string;
  sections: SectionBlock[];
  rawText: string;
};

export type RegionConstraint = {
  maxChars?: number;
  maxLines?: number;
  minFontSize?: number;
  continuationRegion?: string;
};

export type TaggedRegion = {
  tag: string;
  constraints?: RegionConstraint;
};

export type MappingResult = {
  mapped: Record<string, string>;
  unmappedSections: SectionBlock[];
  audit: string[];
};
