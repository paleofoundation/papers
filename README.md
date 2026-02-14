# Pages Template Builder

This app lets you:

1. Upload a `.pages` file.
2. Extract readable text from that file.
3. Fill placeholder values.
4. Generate plain-text output.

## Run

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Usage

- Put placeholders in your template text, e.g. `{{clientName}}` and `{{invoice.total}}`.
- The app auto-detects placeholders and creates input fields for them.
- Click **Render output** to produce final text.
- Optional: provide JSON in the advanced section; manual fields override JSON values.

## Notes on `.pages`

- `.pages` is a zip container.
- The app uses JSZip in the browser and extracts the best text candidate from likely files (`preview.html`, XML/HTML/TXT entries).
- Some newer `.pages` files store main content in Apple IWA binaries. In that case extraction may be incomplete.
