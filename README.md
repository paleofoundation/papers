# Pages Template Builder

This app lets you:

1. Upload a **template** `.pages` file.
2. Upload a **data** `.pages` file.
3. Auto-fill template placeholders from extracted data.
4. Generate plain-text output.

## Run

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Usage

- Template file should contain placeholders like `{{clientName}}` and `{{invoice.total}}`.
- Data file is parsed to populate placeholders.
  - First, the app tries to parse extracted data as JSON.
  - If JSON parsing fails, it falls back to `key: value` lines (nested keys supported with dots, e.g. `invoice.total: 1250`).
- You can still edit values manually and optionally provide JSON in the advanced section.
- Click **Render output** to generate final text.

## Notes on `.pages`

- `.pages` is a zip container.
- The app uses JSZip in the browser and extracts the best text candidate from likely files (`preview.html`, XML/HTML/TXT entries).
- Some newer `.pages` files store main content in Apple IWA binaries. In that case extraction may be incomplete.
