"use client";

import { useState } from "react";

type Region = {
  tag: string;
  maxChars?: number;
  minFontSize?: number;
  continuationRegion?: string;
};

export default function AppClient() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentText, setContentText] = useState("");
  const [regionsJson, setRegionsJson] = useState(
    JSON.stringify(
      [
        { tag: "TITLE", maxChars: 150 },
        { tag: "ABSTRACT", maxChars: 1200, continuationRegion: "ADDITIONAL_INFORMATION" },
        { tag: "SECTION_METHODS", maxChars: 4000 },
        { tag: "ADDITIONAL_INFORMATION", maxChars: 5000 }
      ],
      null,
      2
    )
  );
  const [audit, setAudit] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onGenerate() {
    if (!templateFile) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("template", templateFile);
      if (contentFile) form.append("contentDocx", contentFile);
      if (contentText) form.append("contentText", contentText);
      form.append("regions", regionsJson);

      const res = await fetch("/api/generate", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const auditHeader = res.headers.get("x-audit-report");
      if (auditHeader) {
        try {
          setAudit(JSON.parse(decodeURIComponent(auditHeader)));
        } catch {
          setAudit(["Failed to parse audit header."]);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "OUTPUT.docx";
      a.click();
      URL.revokeObjectURL(url);

      const auditBlob = new Blob([JSON.stringify({ audit }, null, 2)], { type: "application/json" });
      const auditUrl = URL.createObjectURL(auditBlob);
      const ar = document.createElement("a");
      ar.href = auditUrl;
      ar.download = "audit-report.json";
      ar.click();
      URL.revokeObjectURL(auditUrl);
    } catch (error) {
      setAudit([`Generation failed: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>DOCX Template Filler (Local-First)</h1>
      <div className="card">
        <h2>1) Upload TEMPLATE.docx</h2>
        <input type="file" accept=".docx" onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="card">
        <h2>2) Upload CONTENT.docx or paste text/markdown</h2>
        <input type="file" accept=".docx,.txt,.md" onChange={(e) => setContentFile(e.target.files?.[0] ?? null)} />
        <p>OR</p>
        <textarea rows={8} value={contentText} onChange={(e) => setContentText(e.target.value)} />
      </div>

      <div className="card">
        <h2>3) Template Tagger (region metadata)</h2>
        <p>Use predefined tags matching content controls or placeholders in template.</p>
        <textarea rows={14} value={regionsJson} onChange={(e) => setRegionsJson(e.target.value)} />
      </div>

      <div className="card">
        <h2>4) Generate</h2>
        <button disabled={busy || !templateFile} onClick={onGenerate}>
          {busy ? "Generating..." : "Generate OUTPUT.docx + audit"}
        </button>
      </div>

      <div className="card">
        <h2>Audit report</h2>
        <pre>{JSON.stringify(audit, null, 2)}</pre>
      </div>
    </main>
  );
}
