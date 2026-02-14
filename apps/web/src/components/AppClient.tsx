"use client";

import { useState } from "react";

type LayoutTemplateModel = {
  regions: Array<{
    regionId: string;
    label: string;
    signatureCentroid: string;
    constraint: { maxCharsP90: number; maxLinesP90: number; minFontSize: number; continuationRegion?: string };
  }>;
  citationColor: string;
  medoidDocIndex: number;
};

export default function AppClient() {
  const [styleExamples, setStyleExamples] = useState<File[]>([]);
  const [contentDocx, setContentDocx] = useState<File | null>(null);
  const [contentText, setContentText] = useState("");
  const [model, setModel] = useState<LayoutTemplateModel | null>(null);
  const [audit, setAudit] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function inferModel() {
    if (styleExamples.length < 3 || styleExamples.length > 5) return;
    setBusy(true);
    try {
      const form = new FormData();
      styleExamples.forEach((f) => form.append("styleExamples", f));
      const res = await fetch("/api/infer", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setModel(data.model);
    } catch (error) {
      setAudit({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!model || styleExamples.length < 3) return;
    setBusy(true);
    try {
      const form = new FormData();
      styleExamples.forEach((f) => form.append("styleExamples", f));
      if (contentDocx) form.append("contentDocx", contentDocx);
      if (contentText.trim()) form.append("contentText", contentText);
      form.append("model", JSON.stringify(model));

      const res = await fetch("/api/generate-family", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const bytes = Uint8Array.from(atob(data.outputDocxBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "OUTPUT.docx";
      a.click();
      URL.revokeObjectURL(url);

      const auditBlob = new Blob([JSON.stringify(data.audit, null, 2)], { type: "application/json" });
      const auditUrl = URL.createObjectURL(auditBlob);
      const ar = document.createElement("a");
      ar.href = auditUrl;
      ar.download = "audit.json";
      ar.click();
      URL.revokeObjectURL(auditUrl);

      setAudit(data.audit);
    } catch (error) {
      setAudit({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Style Family DOCX Generator</h1>
      <div className="card">
        <h2>1) Upload 3–5 STYLE EXAMPLES (.docx)</h2>
        <input
          type="file"
          multiple
          accept=".docx"
          onChange={(e) => setStyleExamples(Array.from(e.target.files ?? []).slice(0, 5))}
        />
        <div>Selected: {styleExamples.length}</div>
        <button disabled={busy || styleExamples.length < 3} onClick={inferModel}>
          {busy ? "Working..." : "Infer Layout Template Model"}
        </button>
      </div>

      <div className="card">
        <h2>2) Upload CONTENT DOCX or paste structured text</h2>
        <input type="file" accept=".docx" onChange={(e) => setContentDocx(e.target.files?.[0] ?? null)} />
        <p>OR</p>
        <textarea rows={10} value={contentText} onChange={(e) => setContentText(e.target.value)} />
      </div>

      <div className="card">
        <h2>3) Inferred Model</h2>
        <pre>{JSON.stringify(model, null, 2)}</pre>
      </div>

      <div className="card">
        <h2>4) Generate OUTPUT.docx + audit.json</h2>
        <button disabled={busy || !model} onClick={generate}>
          {busy ? "Generating..." : "Generate"}
        </button>
      </div>

      <div className="card">
        <h2>Audit</h2>
        <pre>{JSON.stringify(audit, null, 2)}</pre>
      </div>
    </main>
  );
}
