# Pages Template Builder

This app lets you:

1. Upload a **template** `.pages` file.
2. Upload a **data** `.pages` file.
3. Auto-fill template placeholders from extracted data.
4. Render output with preserved fonts/colors when template preview HTML is available.
5. Download the generated result as a **`.pages`** document.

## Run

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Usage

- Template file should contain placeholders like `{{clientName}}` and `{{invoice.total}}`.
- Data file parsing:
  - JSON first.
  - Fallback to `key: value` lines (`invoice.total: 1250` supported).
- Click **Render output**.
- Click **Download .pages** to export `generated-output.pages`.

## Styling behavior

- If `.pages` contains `preview.html`, the app renders that HTML with placeholders replaced.
- Linked CSS/image assets referenced by the preview are loaded from inside the same `.pages` archive.
- The exported `.pages` file is created from the uploaded template package and includes:
  - updated `preview.html` (when available), and
  - `rendered-output.txt` with the final rendered plain text.

## Notes on `.pages`

- `.pages` is a zip container.
- Some newer `.pages` files store main content in Apple IWA binaries. In that case extraction/export may be incomplete.
