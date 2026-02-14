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
const downloadPagesButton = document.getElementById("downloadPagesButton");
const renderStatus = document.getElementById("renderStatus");
const renderOutput = document.getElementById("renderOutput");
const renderFrame = document.getElementById("renderFrame");

let templateHtml = null;
let templateHtmlPath = null;
let templateZip = null;
let lastRenderedData = null;
const assetUrlCache = new Map();

function normalizeWhitespace(text) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
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

async function extractBestFromPages(file) {
  const zip = await JSZip.loadAsync(file);
  const candidates = collectFileCandidates(zip);

  let bestText = "";
  let previewHtml = null;
  let previewPath = null;

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

      if (name.toLowerCase().endsWith("preview.html") && raw.length > 50) {
        previewHtml = raw;
        previewPath = name;
      }
    } catch {
      // Ignore unreadable entries.
    }
  }

  if (!bestText) {
    throw new Error("Could not extract readable text from this .pages file.");
  }

  return { text: bestText, previewHtml, previewPath, zip };
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

function renderTemplateText(template, data) {
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
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    // Fall through.
  }

  const result = {};
  text.split("\n").forEach((line) => {
    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*(.+?)\s*$/);
    if (!match) return;
    const [, key, value] = match;
    setValueByPath(result, key, value);
  });
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
  return mergeObjects(dataFromJson, collectDataFromPlaceholderFields());
}

function dirname(path) {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx + 1);
}

function resolveZipPath(baseFile, relativePath) {
  if (!relativePath || relativePath.startsWith("data:") || relativePath.startsWith("http") || relativePath.startsWith("blob:")) {
    return null;
  }

  const normalized = relativePath.split("?")[0].split("#")[0];
  if (normalized.startsWith("/")) return normalized.slice(1);

  const joined = `${dirname(baseFile)}${normalized}`;
  const parts = [];
  joined.split("/").forEach((segment) => {
    if (!segment || segment === ".") return;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  });
  return parts.join("/");
}

async function getAssetUrl(zipPath) {
  if (!templateZip || !zipPath) return null;
  if (assetUrlCache.has(zipPath)) return assetUrlCache.get(zipPath);

  const file = templateZip.file(zipPath);
  if (!file) return null;

  const blob = await file.async("blob");
  const url = URL.createObjectURL(blob);
  assetUrlCache.set(zipPath, url);
  return url;
}

async function renderStyledHtml(data) {
  if (!templateHtml || !templateHtmlPath) return "";

  const filledHtml = renderTemplateText(templateHtml, data);
  const parser = new DOMParser();
  const doc = parser.parseFromString(filledHtml, "text/html");

  const links = [...doc.querySelectorAll("link[rel='stylesheet'][href]")];
  for (const link of links) {
    const assetUrl = await getAssetUrl(resolveZipPath(templateHtmlPath, link.getAttribute("href")));
    if (assetUrl) link.setAttribute("href", assetUrl);
  }

  const images = [...doc.querySelectorAll("img[src]")];
  for (const img of images) {
    const assetUrl = await getAssetUrl(resolveZipPath(templateHtmlPath, img.getAttribute("src")));
    if (assetUrl) img.setAttribute("src", assetUrl);
  }

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

async function buildPagesOutputBlob(data) {
  if (!templateZip) {
    throw new Error("Upload a template .pages file first.");
  }

  const outZip = new JSZip();
  const entries = Object.keys(templateZip.files);

  for (const name of entries) {
    const entry = templateZip.files[name];
    if (entry.dir) {
      outZip.folder(name);
      continue;
    }

    const asBlob = await entry.async("blob");
    outZip.file(name, asBlob);
  }

  const dataText = renderTemplateText(templateText.value, data);
  outZip.file("rendered-output.txt", dataText);

  if (templateHtmlPath && templateHtml) {
    const filledHtml = renderTemplateText(templateHtml, data);
    outZip.file(templateHtmlPath, filledHtml);
  }

  return outZip.generateAsync({ type: "blob" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

extractTemplateButton.addEventListener("click", async () => {
  const file = templateFileInput.files?.[0];
  if (!file) {
    templateStatus.textContent = "Choose a template .pages file first.";
    return;
  }

  templateStatus.textContent = "Extracting template text...";
  assetUrlCache.clear();

  try {
    const result = await extractBestFromPages(file);
    templateText.value = result.text;
    templateHtml = result.previewHtml;
    templateHtmlPath = result.previewPath;
    templateZip = result.zip;
    createPlaceholderInputs(result.text);
    downloadPagesButton.disabled = false;

    templateStatus.textContent = templateHtml
      ? "Template extracted with preview styling."
      : "Template extracted (preview styling unavailable).";
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
    const { text } = await extractBestFromPages(file);
    createPlaceholderInputs(templateText.value, extractDataObjectFromText(text));
    dataStatus.textContent = "Data extracted and mapped to placeholders.";
  } catch (error) {
    dataStatus.textContent = `Data extraction failed: ${error.message}`;
  }
});

templateText.addEventListener("input", () => {
  createPlaceholderInputs(templateText.value);
});

renderButton.addEventListener("click", async () => {
  if (!templateText.value.trim()) {
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

  lastRenderedData = data;
  const plainText = renderTemplateText(templateText.value, data);
  renderOutput.textContent = plainText;

  try {
    const styledHtml = await renderStyledHtml(data);
    renderFrame.srcdoc = styledHtml || `<pre>${plainText.replace(/</g, "&lt;")}</pre>`;
    renderStatus.textContent = styledHtml
      ? "Output rendered with fonts/colors. You can now download a .pages file."
      : "Output rendered (styled preview unavailable). You can still download a .pages file.";
  } catch {
    renderFrame.srcdoc = `<pre>${plainText.replace(/</g, "&lt;")}</pre>`;
    renderStatus.textContent = "Output rendered (failed to load some style assets).";
  }
});

downloadPagesButton.addEventListener("click", async () => {
  if (!templateZip) {
    renderStatus.textContent = "Upload a template .pages file first.";
    return;
  }

  let data;
  try {
    data = lastRenderedData ?? readMergedData();
  } catch (error) {
    renderStatus.textContent = `Invalid JSON: ${error.message}`;
    return;
  }

  try {
    const blob = await buildPagesOutputBlob(data);
    downloadBlob(blob, "generated-output.pages");
    renderStatus.textContent = "Downloaded generated-output.pages.";
  } catch (error) {
    renderStatus.textContent = `Failed to build .pages output: ${error.message}`;
  }
});

copyButton.addEventListener("click", async () => {
  const text = renderOutput.textContent;
  if (!text) {
    renderStatus.textContent = "Nothing to copy yet.";
    return;
  }

  await navigator.clipboard.writeText(text);
  renderStatus.textContent = "Plain text copied.";
});

createPlaceholderInputs(templateText.value);
