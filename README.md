# Style-Family DOCX Generator (Codex 5.3)

Local-first system that infers a shared layout grammar from **3–5 style example DOCX files**, then generates a new DOCX for new content while preserving style-family organization.

## Deliverables

- `apps/web` – Next.js UI for upload, inference, generation, and audit download.
- `apps/worker` – Node HTTP API (`/infer`, `/generate`) for local processing.
- `packages/engine` – OpenXML parsing, graph building, signatures, clustering, inference, mapping, citation pass, constraints.

## Why this approach

- We do **not** export/reimport via HTML/PDF.
- We infer containers and constraints from example DOCX documents.
- We generate from a **medoid skeleton** (representative example), preserving OpenXML layout structures.

See `docs/technical-design.md`.

## Local run

```bash
npm install
npm run dev:worker
npm run dev:web
```

Web UI: `http://localhost:3000`.

Worker API: `http://localhost:4010`.

## Workflow

1. Upload **3–5 STYLE EXAMPLES** (`.docx`) in the web app.
2. Click **Infer Layout Template Model**.
3. Upload **CONTENT DOCX** or paste structured text.
4. Click **Generate**.
5. Download `OUTPUT.docx` and `audit.json`.

## API (worker)

### `POST /infer`
JSON body:

```json
{ "styleExamplesBase64": ["..."] }
```

Returns inferred layout model with regions, constraints, citation color, medoid index.

### `POST /generate`
JSON body:

```json
{
  "styleExamplesBase64": ["..."],
  "model": { "regions": [] },
  "contentDocxBase64": "...",
  "contentText": "..."
}
```

Returns:

```json
{ "outputDocxBase64": "...", "audit": { "mappings": [] } }
```

## Inference behavior

The engine parses:

- `word/document.xml`
- `word/styles.xml`
- `word/header*.xml`
- `word/footer*.xml`

Builds a document graph, computes block signatures, clusters cross-document containers, and infers quantile constraints per region.

## Best results guidance

To improve inference stability:

- Keep style examples in the same visual family.
- Use consistent layout tables for abstract/metadata boxes.
- Keep heading styles consistent across examples.
- Preserve repeated header/footer structures.
- Keep section ordering conventions stable.

## Testing

Engine tests include:

- citation parser (`[2–4]`, `(1,2)`),
- block signatures + clustering,
- constraint enforcement,
- integration test with 3 style examples + 1 content input.

Run:

```bash
npm run test
```

## Hosted mode (later)

`docker-compose.yml` is included for hosted deployment experiments; local mode remains default.
