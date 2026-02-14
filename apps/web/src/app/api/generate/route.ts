import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { parseContentText, type TaggedRegion } from "@local-docx/core";
import { generateDocx } from "@local-docx/docx";

export const runtime = "nodejs";

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

async function extractContentText(contentDocx?: File, contentText?: string): Promise<string> {
  if (contentText && contentText.trim()) return contentText;
  if (!contentDocx) throw new Error("Provide CONTENT.docx or text/markdown content");

  const buffer = Buffer.from(await contentDocx.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const template = form.get("template") as File | null;
    const contentDocx = form.get("contentDocx") as File | null;
    const contentText = form.get("contentText") as string | null;
    const regionsRaw = form.get("regions") as string | null;

    if (!template) return new NextResponse("Missing template", { status: 400 });
    if (!regionsRaw) return new NextResponse("Missing regions", { status: 400 });

    const regions = JSON.parse(regionsRaw) as TaggedRegion[];
    const templateBuffer = await fileToArrayBuffer(template);
    const text = await extractContentText(contentDocx ?? undefined, contentText ?? undefined);
    const parsed = parseContentText(text);

    const { output, audit } = await generateDocx(templateBuffer, parsed, {
      regions,
      citationColor: "000000"
    });

    const headers = new Headers();
    headers.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    headers.set("Content-Disposition", 'attachment; filename="OUTPUT.docx"');
    headers.set("x-audit-report", encodeURIComponent(JSON.stringify(audit)));

    return new NextResponse(output, { status: 200, headers });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Unknown error", { status: 500 });
  }
}
