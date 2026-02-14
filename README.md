# Local-First DOCX Template Filler (Codex 5.3)

This project generates a new `OUTPUT.docx` by taking `TEMPLATE.docx` as the style/layout source of truth and replacing only tagged textual regions.

## Why this preserves formatting

- We **do not infer style** from arbitrary documents.
- We fill predefined regions in the template (`content controls` preferred, `{{PLACEHOLDER}}` fallback).
- Word keeps all original layout/style structures (fonts, colors, spacing, columns, headers, shading, etc.).

## Monorepo layout

- `apps/web` – Next.js local UI + API route.
- `packages/core` – content parser, mapping engine, citation parser, constraints.
- `packages/docx` – DOCX fill + OpenXML citation post-processing.
- `docs/technical-design.md` – architecture decisions.

## How to convert existing document to TEMPLATE.docx

1. Open your base document in Word.
2. Save as `TEMPLATE.docx`.
3. Identify regions that should change (title, abstract, section blocks, references, etc.).
4. Preferred: add **content controls** and tags (e.g., `TITLE`, `ABSTRACT`, `SECTION_METHODS`).
5. Fallback: place text placeholders directly such as `{{TITLE}}`, `{{ABSTRACT}}`.

## How to tag regions using the UI

In the "Template Tagger" textarea, provide JSON array entries like:

```json
[
  { "tag": "TITLE", "maxChars": 150 },
  { "tag": "ABSTRACT", "maxChars": 1200, "continuationRegion": "ADDITIONAL_INFORMATION" },
  { "tag": "SECTION_METHODS", "maxChars": 4000 },
  { "tag": "ADDITIONAL_INFORMATION", "maxChars": 5000 }
]
```

- `tag`: region identifier.
- `maxChars`: conservative overflow cap.
- `minFontSize`: minimum shrink target.
- `continuationRegion`: where overflow text should route.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Workflow:
1. Upload `TEMPLATE.docx`.
2. Upload `CONTENT.docx` or paste plain text/markdown.
3. Configure region tags/constraints.
4. Click Generate.
5. Download `OUTPUT.docx` and `audit-report.json`.

## Citation handling

Inline citations like `[1]`, `[2–4]`, `(1,2)` are detected and transformed in OpenXML run-level pass:

- citation chars only are superscripted,
- citation chars are recolored (configurable color).

## Known limitations

- Best with templates explicitly prepared using content controls or placeholders.
- Overflow uses deterministic conservative caps (char/line approximations), not pixel-perfect textbox fit.
- If template has complex nested SDT structures, fallback placeholder flow may be more reliable.
