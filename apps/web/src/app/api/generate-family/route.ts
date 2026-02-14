import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("styleExamples") as File[];
    const modelRaw = form.get("model") as string | null;
    const contentText = (form.get("contentText") as string | null) ?? "";
    const contentDocx = form.get("contentDocx") as File | null;

    if (!modelRaw) return new NextResponse("Missing inferred model", { status: 400 });

    const styleExamplesBase64 = await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer()).toString("base64")));

    const payload: Record<string, unknown> = {
      styleExamplesBase64,
      model: JSON.parse(modelRaw),
      contentText
    };

    if (contentDocx) {
      payload.contentDocxBase64 = Buffer.from(await contentDocx.arrayBuffer()).toString("base64");
    }

    const workerRes = await fetch(process.env.WORKER_URL ?? "http://localhost:4010/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await workerRes.text();
    return new NextResponse(text, {
      status: workerRes.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Unknown error", { status: 500 });
  }
}
