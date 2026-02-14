import JSZip from "jszip";
import { applyCitationStylingToXml } from "./citations";
import { enforceConstraint } from "./constraints";
import { parseOpenXml } from "./openxml";
import type { GenerateAudit, LayoutTemplateModel, ParsedContent } from "./types";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalizeHeading(h: string): string {
  return h.toUpperCase().replace(/[\W_]+/g, " ").trim();
}

function mapContent(model: LayoutTemplateModel, content: ParsedContent): Record<string, string> {
  const mapped: Record<string, string> = {};

  for (const region of model.regions) {
    if (region.label === "TITLE") mapped[region.regionId] = content.title ?? "";
    else if (region.label === "ABSTRACT") mapped[region.regionId] = content.abstract ?? "";
  }

  const bodies = model.regions.filter((r) => r.label.includes("SECTION"));
  content.sections.forEach((section, idx) => {
    const normalized = normalizeHeading(section.heading);
    const preferred = bodies.find((r) => normalizeHeading(r.label).includes(normalized));
    const target = preferred ?? bodies[idx % Math.max(1, bodies.length)];
    if (target) mapped[target.regionId] = (mapped[target.regionId] ? `${mapped[target.regionId]}\n\n` : "") + section.body;
  });

  return mapped;
}

function applyRegionFillsToXml(xml: string, mapped: Record<string, string>): string {
  let out = xml;

  for (const [regionId, text] of Object.entries(mapped)) {
    const escaped = xmlEscape(text);
    out = out.replace(new RegExp(`{{\\s*${regionId}\\s*}}`, "g"), escaped);
    out = out.replace(new RegExp(`{{\\s*${regionId.replace(/^REGION_/, "")}\\s*}}`, "g"), escaped);
  }

  return out;
}

export async function generateFromStyleFamily(
  styleExampleBuffers: ArrayBuffer[],
  content: ParsedContent,
  model: LayoutTemplateModel
): Promise<{ output: Uint8Array; audit: GenerateAudit }> {
  const base = styleExampleBuffers[model.medoidDocIndex];
  const parts = await parseOpenXml(base);
  const mapped = mapContent(model, content);

  const audit: GenerateAudit = {
    mappings: [],
    overflows: [],
    warnings: [],
    styleSimilarityScore: 1
  };

  const constrained: Record<string, string> = {};
  for (const region of model.regions) {
    const raw = mapped[region.regionId] ?? "";
    const outcome = enforceConstraint(raw, region.constraint);
    constrained[region.regionId] = outcome.text;
    audit.mappings.push({ region: region.regionId, source: region.label, confidence: raw ? 0.8 : 0.2 });

    if (outcome.overflow) {
      audit.overflows.push({ region: region.regionId, truncatedChars: outcome.overflow.length });
      if (region.constraint.continuationRegion) {
        constrained[region.constraint.continuationRegion] =
          (constrained[region.constraint.continuationRegion] ?? "") + outcome.overflow;
      } else {
        audit.warnings.push(`Overflow in ${region.regionId}`);
      }
    }
  }

  let xml = applyRegionFillsToXml(parts.documentXml, constrained);
  xml = applyCitationStylingToXml(xml, model.citationColor);

  const zip = parts.zip as JSZip;
  zip.file("word/document.xml", xml);

  const output = await zip.generateAsync({ type: "uint8array" });
  if (audit.mappings.length > 0) {
    const mean = audit.mappings.reduce((a, m) => a + m.confidence, 0) / audit.mappings.length;
    audit.styleSimilarityScore = Number(mean.toFixed(3));
  }

  return { output, audit };
}
