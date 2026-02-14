import type { MappingResult, ParsedContent, TaggedRegion } from "./types";

function normalizeHeading(h: string): string {
  return h.toUpperCase().replace(/[\W_]+/g, " ").trim();
}

export function mapContentToRegions(content: ParsedContent, regions: TaggedRegion[]): MappingResult {
  const mapped: Record<string, string> = {};
  const audit: string[] = [];

  const byTag = new Map(regions.map((r) => [r.tag.toUpperCase(), r]));

  if (content.title && byTag.has("TITLE")) mapped.TITLE = content.title;
  if (content.abstract && byTag.has("ABSTRACT")) mapped.ABSTRACT = content.abstract;

  const sectionRegionTags = regions.map((r) => r.tag).filter((t) => t.toUpperCase().startsWith("SECTION_"));
  const unmappedSections = [];

  for (const sec of content.sections) {
    const normalized = normalizeHeading(sec.heading);
    const exactTag = `SECTION_${normalized.replace(/\s+/g, "_")}`;
    if (byTag.has(exactTag)) {
      mapped[exactTag] = sec.body;
      continue;
    }

    const fuzzy = sectionRegionTags.find((t) => normalizeHeading(t.replace(/^SECTION_/, "")) === normalized);
    if (fuzzy) {
      mapped[fuzzy] = sec.body;
      continue;
    }

    unmappedSections.push(sec);
    audit.push(`Unmapped section: ${sec.heading}`);
  }

  if (unmappedSections.length > 0 && byTag.has("ADDITIONAL_INFORMATION")) {
    mapped.ADDITIONAL_INFORMATION = unmappedSections.map((s) => `## ${s.heading}\n${s.body}`).join("\n\n");
    audit.push("Routed unmapped sections to ADDITIONAL_INFORMATION.");
  }

  return { mapped, unmappedSections, audit };
}
