import type { ParsedContent } from "./types";

function trim(s: string): string {
  return s.replace(/\r/g, "").trim();
}

export function parseContentText(input: string): ParsedContent {
  const lines = input.split("\n").map(trim);
  const sections: ParsedContent["sections"] = [];

  let title: string | undefined;
  let abstract: string | undefined;
  let currentHeading: string | null = null;
  let currentBody: string[] = [];

  for (const line of lines) {
    if (!line) continue;

    if (!title && !line.toLowerCase().startsWith("abstract")) {
      title = line;
      continue;
    }

    if (line.toLowerCase().startsWith("abstract:")) {
      abstract = line.slice("abstract:".length).trim();
      continue;
    }

    if (/^#{1,3}\s+/.test(line) || /^[A-Z][A-Z\s]{3,}$/.test(line)) {
      if (currentHeading && currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join("\n").trim() });
      }
      currentHeading = line.replace(/^#{1,3}\s+/, "").trim();
      currentBody = [];
      continue;
    }

    currentBody.push(line);
  }

  if (currentHeading && currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join("\n").trim() });
  }

  return {
    title,
    abstract,
    sections,
    rawText: input
  };
}
