import { findCitationTokens } from "@local-docx/core";

function superscriptRun(text: string, color = "000000"): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<w:r><w:rPr><w:vertAlign w:val="superscript"/><w:color w:val="${color}"/></w:rPr><w:t>${escaped}</w:t></w:r>`;
}

export function applyCitationStylingToXml(xml: string, citationColor = "000000"): string {
  return xml.replace(/<w:t>([\s\S]*?)<\/w:t>/g, (full, text: string) => {
    const tokens = findCitationTokens(text);
    if (tokens.length === 0) return full;

    let cursor = 0;
    let out = "";
    for (const token of tokens) {
      const before = text.slice(cursor, token.start);
      if (before) out += `<w:r><w:t>${before}</w:t></w:r>`;
      out += superscriptRun(token.raw, citationColor);
      cursor = token.end;
    }

    const tail = text.slice(cursor);
    if (tail) out += `<w:r><w:t>${tail}</w:t></w:r>`;
    return out;
  });
}
