import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const pagesFileInput = document.getElementById("pagesFile");
const extractButton = document.getElementById("extractButton");
const extractStatus = document.getElementById("extractStatus");
const templateText = document.getElementById("templateText");
const jsonInput = document.getElementById("jsonInput");
const renderButton = document.getElementById("renderButton");
const copyButton = document.getElementById("copyButton");
const renderStatus = document.getElementById("renderStatus");
const renderOutput = document.getElementById("renderOutput");

function collectFileCandidates(zip) {
  const preferredPatterns = [
    /preview\.html$/i,
    /index\.xml$/i,
    /document\.xml$/i,
    /\.xml$/i,
    /\.html$/i,
    /\.txt$/i,
  ];

  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  return names.sort((a, b) => {
    const score = (name) => {
      const lower = name.toLowerCase();
      let s = 100;
      preferredPatterns.forEach((pattern, idx) => {
        if (pattern.test(lower)) s = Math.min(s, idx);
      });
      return s;
    };
    return score(a) - score(b);
  });
}

function extractReadableText(raw, path) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "xml" || ext === "html") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/xml");
    const text = doc.documentElement?.textContent ?? raw;
    return normalizeWhitespace(text);
  }

  return normalizeWhitespace(raw);
}

function normalizeWhitespace(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getValueByPath(data, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, data);
}

function renderTemplate(template, data) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, token) => {
    const value = getValueByPath(data, token);
    return value === undefined || value === null ? "" : String(value);
  });
}

async function extractTemplateFromPages(file) {
  const zip = await JSZip.loadAsync(file);
  const candidates = collectFileCandidates(zip);

  const extractedBlocks = [];

  for (const name of candidates) {
    const isLikelyText = /\.(xml|html|txt)$/i.test(name) || /preview/i.test(name);
    if (!isLikelyText) continue;

    try {
      const raw = await zip.file(name)?.async("string");
      if (!raw) continue;
      const cleaned = extractReadableText(raw, name);
      if (cleaned.length > 30) {
        extractedBlocks.push(`--- ${name} ---\n${cleaned}`);
      }
    } catch {
      // Skip binary or unreadable entries.
    }

    if (extractedBlocks.join("\n\n").length > 30000) {
      break;
    }
  }

  if (extractedBlocks.length === 0) {
    throw new Error(
      "Could not extract readable text. This .pages file may use a newer internal format without plain-text previews.",
    );
  }

  return extractedBlocks.join("\n\n");
}

extractButton.addEventListener("click", async () => {
  const file = pagesFileInput.files?.[0];
  if (!file) {
    extractStatus.textContent = "Choose a .pages file first.";
    return;
  }

  extractStatus.textContent = "Extracting text from .pages document...";

  try {
    const extracted = await extractTemplateFromPages(file);
    templateText.value = extracted;
    extractStatus.textContent = "Template text extracted. You can now edit placeholders and render output.";
  } catch (error) {
    extractStatus.textContent = `Extraction failed: ${error.message}`;
  }
});

renderButton.addEventListener("click", () => {
  const template = templateText.value;
  if (!template.trim()) {
    renderStatus.textContent = "Template is empty. Upload/extract or paste template text first.";
    return;
  }

  let data;
  try {
    data = JSON.parse(jsonInput.value);
  } catch (error) {
    renderStatus.textContent = `Invalid JSON: ${error.message}`;
    return;
  }

  const rendered = renderTemplate(template, data);
  renderOutput.textContent = rendered;
  renderStatus.textContent = "Output rendered successfully.";
});

copyButton.addEventListener("click", async () => {
  const text = renderOutput.textContent;
  if (!text) {
    renderStatus.textContent = "Nothing to copy yet. Render output first.";
    return;
  }
  await navigator.clipboard.writeText(text);
  renderStatus.textContent = "Output copied to clipboard.";
});
