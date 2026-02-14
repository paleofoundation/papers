import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("styleExamples") as File[];
    if (files.length < 3 || files.length > 5) {
      return new NextResponse("Provide 3 to 5 style examples", { status: 400 });
    }

    const styleExamplesBase64 = await Promise.all(
      files.map(async (f) => Buffer.from(await f.arrayBuffer()).toString("base64"))
    );

    const workerRes = await fetch(process.env.WORKER_URL ?? "http://localhost:4010/infer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleExamplesBase64 })
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
