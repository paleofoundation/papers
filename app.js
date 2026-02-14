import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const pagesFileInput = document.getElementById("pagesFile");
const extractButton = document.getElementById("extractButton");
const extractStatus = document.getElementById("extractStatus");
const templateText = document.getElementById("templateText");
const placeholderFields = document.getElementById("placeholderFields");
const jsonInput = document.getElementById("jsonInput");
const renderButton = document.getElementById("renderButton");
const copyButton = document.getElementById("copyButton");
const renderStatus = document.getElementById("renderStatus");
const renderOutput = document.getElementById("renderOutput");

function normalizeWhitespace(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectFileCandidates(zip) {
  const entries = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const scoreEntry = (name) => {
    const lower = name.toLowerCase();
    if (lower.endsWith("preview.html")) return 0;
    if (lower.endsWith("index.xml")) return 1;
    if (lower.endsWith("document.xml")) return 2;
    if (lower.endsWith(".xml")) return 3;
    if (lower.endsWith(".html")) return 4;
    if (lower.endsWith(".txt")) return 5;
    return 10;
  };

  return entries
    .map((name) => ({ name, score: scoreEntry(name) }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.name);
}

function extractReadableText(raw, path) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "xml" || ext === "html") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/xml");
    return normalizeWhitespace(doc.documentElement?.textContent ?? raw);
  }

  return normalizeWhitespace(raw);
}

function findPlaceholders(template) {
  const placeholders = new Set();
  template.replace(/{{\s*([\w.]+)\s*}}/g, (_, token) => {
    placeholders.add(token);
    return "";
  });
  return [...placeholders];
}

function setValueByPath(target, path, value) {
  const parts = path.split(".");
  let current = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  current[parts[parts.length - 1]] = value;
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

function createPlaceholderInputs(template) {
  const placeholders = findPlaceholders(template);
  placeholderFields.innerHTML = "";

  if (placeholders.length === 0) {
    placeholderFields.innerHTML = "<p class='hint'>No placeholders found. Add tokens like {{name}} in the template.</p>";
    return;
  }

  placeholders.forEach((token) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = document.createElement("label");
    label.innerHTML = `<code>{{${token}}}</code>`;

    const input = document.createElement("input");
    input.type = "text";
    input.dataset.token = token;
    input.placeholder = `Value for ${token}`;

    wrapper.append(label, input);
    placeholderFields.append(wrapper);
  });
}

function readInputData() {
  const dataFromFields = {};
  const fieldInputs = placeholderFields.querySelectorAll("input[data-token]");

  fieldInputs.forEach((input) => {
    if (input.value.trim() !== "") {
      setValueByPath(dataFromFields, input.dataset.token, input.value);
    }
  });

  let dataFromJson = {};
  const jsonRaw = jsonInput.value.trim();
  if (jsonRaw) {
    dataFromJson = JSON.parse(jsonRaw);
  }

  return mergeObjects(dataFromJson, dataFromFields);
}

function mergeObjects(base, override) {
  if (typeof base !== "object" || base === null) return override;
  if (typeof override !== "object" || override === null) return override;

  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (key in result && typeof result[key] === "object" && typeof override[key] === "object") {
      result[key] = mergeObjects(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

async function extractTemplateFromPages(file) {
  const zip = await JSZip.loadAsync(file);
  const candidates = collectFileCandidates(zip);

  let bestText = "";

  for (const name of candidates) {
    const isLikelyText = /\.(xml|html|txt)$/i.test(name) || /preview/i.test(name);
    if (!isLikelyText) continue;

    try {
      const raw = await zip.file(name)?.async("string");
      if (!raw) continue;

      const cleaned = extractReadableText(raw, name);
      if (cleaned.length > bestText.length) {
        bestText = cleaned;
      }

      if (name.toLowerCase().endsWith("preview.html") && cleaned.length > 50) {
        return cleaned;
      }
    } catch {
      // Ignore non-readable entries.
    }
  }

  if (!bestText) {
    throw new Error("Could not extract readable text from this .pages file.");
  }

  return bestText;
}

extractButton.addEventListener("click", async () => {
  const file = pagesFileInput.files?.[0];
  if (!file) {
    extractStatus.textContent = "Choose a .pages file first.";
    return;
  }

  extractStatus.textContent = "Extracting text...";

  try {
    const extracted = await extractTemplateFromPages(file);
    templateText.value = extracted;
    createPlaceholderInputs(extracted);
    extractStatus.textContent = "Template extracted. Fill values and click Render output.";
  } catch (error) {
    extractStatus.textContent = `Extraction failed: ${error.message}`;
  }
});

templateText.addEventListener("input", () => {
  createPlaceholderInputs(templateText.value);
});

renderButton.addEventListener("click", () => {
  const template = templateText.value;
  if (!template.trim()) {
    renderStatus.textContent = "Template is empty.";
    return;
  }

  let data;
  try {
    data = readInputData();
  } catch (error) {
    renderStatus.textContent = `Invalid JSON: ${error.message}`;
    return;
  }

  renderOutput.textContent = renderTemplate(template, data);
  renderStatus.textContent = "Output rendered.";
});

copyButton.addEventListener("click", async () => {
  const text = renderOutput.textContent;
  if (!text) {
    renderStatus.textContent = "Nothing to copy yet.";
    return;
  }
  await navigator.clipboard.writeText(text);
  renderStatus.textContent = "Copied.";
});

createPlaceholderInputs(templateText.value);
