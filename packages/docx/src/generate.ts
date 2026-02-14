import type { ParsedContent, TaggedRegion } from "@local-docx/core";
import { enforceConstraints, mapContentToRegions } from "@local-docx/core";
import { applyCitationStylingToXml } from "./citation-pass";
import { fillTemplateDocx } from "./fill";

export type GenerateOptions = {
  regions: TaggedRegion[];
  citationColor?: string;
};

export async function generateDocx(
  templateBuffer: ArrayBuffer,
  content: ParsedContent,
  options: GenerateOptions
): Promise<{ output: Uint8Array; audit: string[] }> {
  const mapping = mapContentToRegions(content, options.regions);
  const constrained: Record<string, string> = {};
  const audit = [...mapping.audit];

  for (const region of options.regions) {
    const raw = mapping.mapped[region.tag] ?? "";
    const applied = enforceConstraints(raw, region.constraints);
    constrained[region.tag] = applied.text;

    if (applied.overflow) {
      if (region.constraints?.continuationRegion) {
        constrained[region.constraints.continuationRegion] =
          (constrained[region.constraints.continuationRegion] ?? "") + applied.overflow;
        audit.push(`Overflow routed from ${region.tag} to ${region.constraints.continuationRegion}.`);
      } else {
        audit.push(`Overflow warning in ${region.tag}: ${applied.overflow.length} chars truncated.`);
      }
    }
  }

  const zip = await fillTemplateDocx(templateBuffer, constrained);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("word/document.xml not found after fill");

  const xml = await docFile.async("string");
  const transformed = applyCitationStylingToXml(xml, options.citationColor ?? "000000");
  zip.file("word/document.xml", transformed);

  const output = await zip.generateAsync({ type: "uint8array" });
  return { output, audit };
}
