# Pages Template Builder

A lightweight browser app to:

1. Ingest a `.pages` file.
2. Extract readable text as a template (best effort).
3. Let you insert placeholder data with JSON.
4. Output final rendered text.

## Run locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## How it works

- `.pages` files are zip containers.
- The app opens the zip in-browser using JSZip.
- It searches likely text files (`preview.html`, `index.xml`, other `.xml/.html/.txt`) and extracts readable text.
- You can edit extracted text and add placeholders like `{{name}}` or `{{invoice.total}}`.
- Rendering replaces placeholders using JSON input.

## Limitation

Newer Apple Pages versions can store core document content in binary IWA files. In those files, only preview text (if available) can be extracted with this browser-only approach.
