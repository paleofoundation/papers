import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseContentText } from "@local-docx/core";
import { generateDocx } from "../src/generate";

async function makeTemplate(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>{{TITLE}}</w:t></w:r></w:p><w:p><w:r><w:t>{{ABSTRACT}}</w:t></w:r></w:p></w:body></w:document>`
  );
  return await zip.generateAsync({ type: "arraybuffer" });
}

describe("docx generation integration", () => {
  it("fills placeholders and applies citation superscript", async () => {
    const template = await makeTemplate();
    const content = parseContentText("My Paper\nAbstract: Test cites [2-4] and (1,2)");

    const { output, audit } = await generateDocx(template, content, {
      regions: [{ tag: "TITLE" }, { tag: "ABSTRACT" }],
      citationColor: "123456"
    });

    const zip = await JSZip.loadAsync(output);
    const xml = await zip.file("word/document.xml")!.async("string");

    expect(xml).toContain("My Paper");
    expect(xml).toContain('w:vertAlign w:val="superscript"');
    expect(xml).toContain('w:color w:val="123456"');
    expect(audit).toEqual([]);
  });
});
