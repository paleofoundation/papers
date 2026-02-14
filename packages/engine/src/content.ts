import mammoth from "mammoth";
import type { ParsedContent } from "./types";

export async function parseContentDocx(buffer: ArrayBuffer): Promise<ParsedContent> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return parseStructuredText(result.value);
}

export function parseStructuredText(text: string): ParsedContent {
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const sections: ParsedContent["sections"] = [];

  let title: string | undefined;
  let abstract: string | undefined;
  let currentHeading: string | undefined;
  let body: string[] = [];

  for (const line of lines) {
    if (!title) {
      title = line;
      continue;
    }

    if (line.toLowerCase().startsWith("abstract:")) {
      abstract = line.replace(/^abstract:\s*/i, "");
      continue;
    }

    if (/^#{1,3}\s+/.test(line) || /^[A-Z][A-Z\s]{3,}$/.test(line)) {
      if (currentHeading) sections.push({ heading: currentHeading, body: body.join("\n") });
      currentHeading = line.replace(/^#{1,3}\s+/, "");
      body = [];
      continue;
    }

    body.push(line);
  }

  if (currentHeading) sections.push({ heading: currentHeading, body: body.join("\n") });
  return { title, abstract, sections, rawText: text };
}
