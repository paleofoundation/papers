export type CitationToken = { raw: string; start: number; end: number; values: number[] };

const tokenPattern = /(\[(?:\d+[\-,–]?\d*(?:\s*,\s*\d+[\-,–]?\d*)*)\]|\((?:\d+[\-,–]?\d*(?:\s*,\s*\d+[\-,–]?\d*)*)\))/g;

export function expandCitationNumbers(rawInner: string): number[] {
  const out: number[] = [];
  for (const part of rawInner.split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*[\-–]\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let i = lo; i <= hi; i += 1) out.push(i);
    } else if (/^\d+$/.test(part)) out.push(Number(part));
  }
  return out;
}

export function findCitationTokens(text: string): CitationToken[] {
  const tokens: CitationToken[] = [];
  for (const match of text.matchAll(tokenPattern)) {
    if (match.index === undefined) continue;
    const raw = match[0];
    tokens.push({ raw, start: match.index, end: match.index + raw.length, values: expandCitationNumbers(raw.slice(1, -1)) });
  }
  return tokens;
}

export function applyCitationStylingToXml(xml: string, color = "000000"): string {
  return xml.replace(/<w:t>([\s\S]*?)<\/w:t>/g, (whole, text: string) => {
    const tokens = findCitationTokens(text);
    if (tokens.length === 0) return whole;

    let out = "";
    let cursor = 0;
    for (const t of tokens) {
      const before = text.slice(cursor, t.start);
      if (before) out += `<w:r><w:t>${before}</w:t></w:r>`;
      out += `<w:r><w:rPr><w:vertAlign w:val="superscript"/><w:color w:val="${color}"/></w:rPr><w:t>${t.raw}</w:t></w:r>`;
      cursor = t.end;
    }
    const tail = text.slice(cursor);
    if (tail) out += `<w:r><w:t>${tail}</w:t></w:r>`;
    return out;
  });
}
