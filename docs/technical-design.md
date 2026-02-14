# Technical Design: Style-Family DOCX Inference + Generation (Codex 5.3)

## 1) Why inferred skeleton reuse (not reconstruction)

The system infers an internal **Layout Template Model** from 3–5 DOCX style examples but still generates by reusing an observed DOCX skeleton (medoid example). This avoids rebuilding layout from scratch and preserves OpenXML constructs that control visual fidelity:

- section/column definitions (`w:sectPr`, `w:cols`)
- header/footer references and content parts
- table geometry, cell shading/borders
- anchored shapes/textboxes where present
- paragraph/run style references and direct formatting.

So the inference stage learns **where** and **how much** content should go, while generation mutates text inside a representative existing structure.

## 2) Layout Template Model

### 2.1 Document Graph
For each style example:
- Parse `word/document.xml`, `styles.xml`, `header*.xml`, `footer*.xml`.
- Build a graph with node types:
  - `paragraph`, `table`, `tableCell`, `section`, `header`, `footer`, `shape` (when detectable),
  - each node stores style/position metadata.
- Edges:
  - `contains`, `next`, `anchoredTo`, `styleRef`.

### 2.2 Block signatures
Candidate container blocks (tables, repeated paragraph clusters, header/footer blocks) are fingerprinted by:
- structure signature (table dimensions, border/shading features, section/column context),
- style signature (dominant pStyle/rStyle/size/color/bold/caps),
- relative position (normalized order index, top-of-document, header/footer scope).

### 2.3 Cross-document alignment
- Cluster block signatures by weighted similarity.
- Stable clusters become inferred regions/containers.
- Labels are inferred heuristically (e.g., short top block => TITLE-like; shaded mid-top block => ABSTRACT-like; repeating heading/body patterns => SECTION_HEADER/BODY).

### 2.4 Constraint inference
For each region cluster across examples:
- collect empirical char-count and line-count proxies,
- store quantile-based limits (e.g., p90 max chars, p90 max lines),
- infer min font size from observed run sizes,
- define overflow policy: shrink-to-min, then continuation region, else audit warning.

## 3) Content mapping
Input content (DOCX via mammoth or plain text) is normalized into:
- title, authors, affiliations, abstract,
- ordered sections `{ heading, body }`,
- references/citations.

Mapping order:
1. label compatibility (TITLE -> TITLE-like region),
2. heading similarity for section regions,
3. positional fallback to nearest compatible region.

All non-exact mappings are reported in audit.

## 4) Generation pipeline
1. Select medoid style example as base skeleton.
2. Fill inferred regions by replacing text runs while preserving style refs.
3. Constraint enforcement per region (truncate/shrink/overflow routing) with deterministic decisions.
4. Citation pass on OpenXML runs:
   - detect `[1]`, `[2–4]`, `(1,2)` etc.,
   - split run text so citation chars are isolated,
   - apply superscript + inferred citation color token.
5. Emit `OUTPUT.docx` and `audit.json`:
   - mapping decisions,
   - constraint actions,
   - overflow records,
   - style token similarity score.

## 5) Product architecture
- `apps/web`: Next.js local-first UI.
- `apps/worker`: Node HTTP API for inference + generation.
- `packages/engine`: OpenXML parsing, graph/signature/clustering/inference/generation.

Local mode is default (on-device processing). Hosted mode can run via `docker-compose` with ephemeral file handling.
