import JSZip from "jszip";

export type OpenXmlParts = {
  zip: JSZip;
  documentXml: string;
  stylesXml?: string;
  headers: Array<{ path: string; xml: string }>;
  footers: Array<{ path: string; xml: string }>;
};

export async function parseOpenXml(buffer: ArrayBuffer): Promise<OpenXmlParts> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("Missing word/document.xml");

  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const headers: Array<{ path: string; xml: string }> = [];
  const footers: Array<{ path: string; xml: string }> = [];

  for (const name of Object.keys(zip.files)) {
    if (/^word\/header\d+\.xml$/.test(name)) {
      headers.push({ path: name, xml: await zip.file(name)!.async("string") });
    }
    if (/^word\/footer\d+\.xml$/.test(name)) {
      footers.push({ path: name, xml: await zip.file(name)!.async("string") });
    }
  }

  return { zip, documentXml, stylesXml, headers, footers };
}

export function extractParagraphBlocks(xml: string): Array<{ text: string; pStyle?: string; raw: string }> {
  const blocks: Array<{ text: string; pStyle?: string; raw: string }> = [];
  const pMatches = xml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];

  for (const raw of pMatches) {
    const style = raw.match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1];
    const texts = [...raw.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    blocks.push({ text: texts.join(""), pStyle: style, raw });
  }

  return blocks;
}

export function countTables(xml: string): number {
  return (xml.match(/<w:tbl[\s>]/g) ?? []).length;
}

export function extractCitationColor(stylesXml?: string): string {
  if (!stylesXml) return "000000";
  const color = stylesXml.match(/<w:color[^>]*w:val="([0-9A-Fa-f]{6})"/)?.[1];
  return color ?? "000000";
}
