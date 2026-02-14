import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const templateFileInput = document.getElementById("templateFile");
const extractTemplateButton = document.getElementById("extractTemplateButton");
const templateStatus = document.getElementById("templateStatus");
const templateText = document.getElementById("templateText");

const dataFileInput = document.getElementById("dataFile");
const extractDataButton = document.getElementById("extractDataButton");
const dataStatus = document.getElementById("dataStatus");

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

async function extractBestTextFromPages(file) {
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
      // Ignore unreadable entries.
    }
  }

  if (!bestText) {
    throw new Error("Could not extract readable text from this .pages file.");
  }

  return bestText;
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

function extractDataObjectFromText(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    // Fall through to key:value parsing.
  }

  const result = {};
  const lines = text.split("\n");

  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*(.+?)\s*$/);
    if (!match) continue;

    const [, key, value] = match;
    setValueByPath(result, key, value);
  }

  return result;
}

function createPlaceholderInputs(template, initialData = {}) {
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

    const existingValue = getValueByPath(initialData, token);
    if (existingValue !== undefined && existingValue !== null) {
      input.value = String(existingValue);
    }

    wrapper.append(label, input);
    placeholderFields.append(wrapper);
  });
}

function collectDataFromPlaceholderFields() {
  const data = {};
  const inputs = placeholderFields.querySelectorAll("input[data-token]");

  inputs.forEach((input) => {
    if (input.value.trim() !== "") {
      setValueByPath(data, input.dataset.token, input.value);
    }
  });

  return data;
}

function readMergedData() {
  let dataFromJson = {};
  const jsonRaw = jsonInput.value.trim();
  if (jsonRaw) {
    dataFromJson = JSON.parse(jsonRaw);
  }

  const dataFromFields = collectDataFromPlaceholderFields();
  return mergeObjects(dataFromJson, dataFromFields);
}

extractTemplateButton.addEventListener("click", async () => {
  const file = templateFileInput.files?.[0];
  if (!file) {
    templateStatus.textContent = "Choose a template .pages file first.";
    return;
  }

  templateStatus.textContent = "Extracting template text...";

  try {
    const extracted = await extractBestTextFromPages(file);
    templateText.value = extracted;
    createPlaceholderInputs(extracted);
    templateStatus.textContent = "Template extracted. Now upload your data .pages file.";
  } catch (error) {
    templateStatus.textContent = `Template extraction failed: ${error.message}`;
  }
});

extractDataButton.addEventListener("click", async () => {
  const file = dataFileInput.files?.[0];
  if (!file) {
    dataStatus.textContent = "Choose a data .pages file first.";
    return;
  }

  dataStatus.textContent = "Extracting values from data file...";

  try {
    const extractedText = await extractBestTextFromPages(file);
    const dataObject = extractDataObjectFromText(extractedText);

    createPlaceholderInputs(templateText.value, dataObject);
    dataStatus.textContent = "Data extracted and mapped to detected placeholders.";
  } catch (error) {
    dataStatus.textContent = `Data extraction failed: ${error.message}`;
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
    data = readMergedData();
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
