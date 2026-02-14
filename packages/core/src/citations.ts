export type CitationToken = {
  raw: string;
  start: number;
  end: number;
  values: number[];
};

const tokenPattern = /(\[(?:\d+[\-,–]?\d*(?:\s*,\s*\d+[\-,–]?\d*)*)\]|\((?:\d+[\-,–]?\d*(?:\s*,\s*\d+[\-,–]?\d*)*)\))/g;

export function expandCitationNumbers(rawInner: string): number[] {
  const parts = rawInner.split(",").map((s) => s.trim()).filter(Boolean);
  const out: number[] = [];

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*[\-–]\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const [lo, hi] = start <= end ? [start, end] : [end, start];
      for (let n = lo; n <= hi; n += 1) out.push(n);
    } else if (/^\d+$/.test(part)) {
      out.push(Number(part));
    }
  }

  return out;
}

export function findCitationTokens(text: string): CitationToken[] {
  const tokens: CitationToken[] = [];
  for (const match of text.matchAll(tokenPattern)) {
    if (!match.index && match.index !== 0) continue;
    const raw = match[0];
    const inner = raw.slice(1, -1);
    tokens.push({
      raw,
      start: match.index,
      end: match.index + raw.length,
      values: expandCitationNumbers(inner)
    });
  }
  return tokens;
}
