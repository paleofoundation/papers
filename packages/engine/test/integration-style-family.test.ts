import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { inferLayoutTemplateModel } from "../src/infer";
import { parseStructuredText } from "../src/content";
import { generateFromStyleFamily } from "../src/generate";

async function makeExample(title: string, abstract: string, methods: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="w"><w:body>
      <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>{{REGION_0}}</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="Abstract"/></w:pPr><w:r><w:t>{{REGION_1}}</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>{{REGION_2}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>${title} ${abstract} ${methods}</w:t></w:r></w:p>
    </w:body></w:document>`
  );
  zip.file("word/styles.xml", `<w:styles xmlns:w="w"><w:style><w:rPr><w:color w:val="445566"/></w:rPr></w:style></w:styles>`);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("style family integration", () => {
  it("infers model from 3 examples and generates output+audit", async () => {
    const ex1 = await makeExample("T1", "A1", "M1");
    const ex2 = await makeExample("T2", "A2", "M2");
    const ex3 = await makeExample("T3", "A3", "M3");

    const model = await inferLayoutTemplateModel([ex1, ex2, ex3]);
    const content = parseStructuredText("My New Title\nAbstract: cites [2-4]\n# METHODS\nBody (1,2)");
    const { output, audit } = await generateFromStyleFamily([ex1, ex2, ex3], content, model);

    const zip = await JSZip.loadAsync(output);
    const xml = await zip.file("word/document.xml")!.async("string");

    expect(xml).toContain("superscript");
    expect(audit.mappings.length).toBeGreaterThan(0);
    expect(audit.styleSimilarityScore).toBeGreaterThan(0);
  });
});
