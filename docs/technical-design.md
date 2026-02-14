# Technical Design: Template-First DOCX Generation (Local-First)

## Why template filling instead of style inference

We choose **template filling** as the primary strategy because DOCX layout fidelity depends on many interdependent OpenXML constructs (paragraph styles, run properties, section properties, table grids, numbering definitions, headers/footers, drawing anchors, text boxes, columns, shading, etc.).

Attempting to infer style from an arbitrary input and reconstruct equivalent layout is brittle and non-deterministic. By treating `TEMPLATE.docx` as the single source of truth, we:

- preserve existing layout and style objects exactly,
- only change text in explicitly tagged regions,
- reduce risk of style drift,
- provide deterministic, auditable behavior.

This aligns with the requirement to preserve fonts/colors/spacing/columns/header placement and shaded boxes.

## Region representation model

We support two mechanisms:

1. **Preferred**: Content control tags (SDTs) in WordprocessingML (`w:sdt` with `w:tag/@w:val`).
2. **Fallback**: Plain placeholders in text (`{{TAG_NAME}}`).

The Template Tagger UI stores region metadata (`tag`, constraints, continuation target) in a sidecar JSON. Generation uses this metadata with the template document:

- direct tag mapping (`TITLE -> TITLE`),
- section heading normalization for section mappings,
- optional fallback mapping to `ADDITIONAL_INFORMATION` region.

## Content parsing and mapping

`CONTENT.docx` is parsed semantically using `mammoth` to derive a structured model:

- `title`, `authors`, `affiliations`, `abstract`,
- `sections[] = { heading, body }`,
- optional table-like blocks,
- citation candidates in text.

Mapping strategy:

- exact region tag match first,
- normalized heading match for sections,
- unmapped content recorded in audit.

## OpenXML post-processing for citations

After primary template fill, a second pass edits `word/document.xml` at run level:

1. Walk text runs (`w:r/w:t`) in mapped regions.
2. Detect citation tokens (`[1]`, `[2–4]`, `(1,2)` etc.) using deterministic parser.
3. Split runs so citation substrings become separate runs.
4. Apply run properties:
   - superscript (`w:vertAlign w:val="superscript"`),
   - citation color (`w:color w:val="..."`) based on region/template policy.

Only citation characters are transformed; surrounding text remains unchanged.

## Region constraints / overflow

Each region can define constraints:

- `maxChars`,
- `maxLines` (conservative estimate),
- `minFontSize`.

Deterministic enforcement order:

1. Attempt shrink by reducing run font size metadata down to `minFontSize`.
2. If still exceeding cap, route overflow to configured continuation region.
3. Else record overflow warning in audit.

No claim of perfect pixel fit is made; the system reports cap-based enforcement decisions.

## Local-first architecture

- Next.js app and API routes run locally.
- Files are processed in memory or local temp paths only.
- No remote upload by default.

## Packages

- `apps/web`: Upload/tag/generate UI + API route.
- `packages/core`: parsing, mapping, citations, constraints, audit model.
- `packages/docx`: placeholder/content-control fill and OpenXML citation post-processing.
