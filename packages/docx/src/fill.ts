import JSZip from "jszip";

export async function fillTemplateDocx(templateBuffer: ArrayBuffer, mapped: Record<string, string>): Promise<JSZip> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Template missing word/document.xml");

  let xml = await docFile.async("string");

  for (const [tag, value] of Object.entries(mapped)) {
    const escaped = value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const placeholder = new RegExp(`{{\\s*${tag}\\s*}}`, "g");
    xml = xml.replace(placeholder, escaped);

    // Very conservative SDT replacement fallback: replace text in block containing tag marker.
    const sdtPattern = new RegExp(`(<w:tag[^>]*w:val=\"${tag}\"[^>]*>[\\s\\S]*?<w:t>)([\\s\\S]*?)(</w:t>)`, "g");
    xml = xml.replace(sdtPattern, `$1${escaped}$3`);
  }

  zip.file("word/document.xml", xml);
  return zip;
}
