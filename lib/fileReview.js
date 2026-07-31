const JSZip = require("jszip");

// Extensions we treat as readable text/code. Anything else inside a zip
// (images, binaries, node_modules, etc.) is skipped.
const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "py", "java", "c", "h", "cpp", "hpp", "cs", "go",
  "rs", "php", "rb", "sql", "html", "htm", "css", "scss", "json", "yml",
  "yaml", "sh", "md", "markdown", "txt", "env", "toml", "ini", "xml", "csv",
  "gitignore", "dockerfile", "vercel", "gitattributes",
]);

const SKIP_PATH_PARTS = ["node_modules/", ".git/", "dist/", "build/", "__pycache__/", ".next/"];

const MAX_FILES = 40;
const MAX_CHARS_PER_FILE = 3000;
const MAX_TOTAL_CHARS = 12000;
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // Telegram bot API file-download cap

function extOf(name) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isReadable(path) {
  if (SKIP_PATH_PARTS.some((p) => path.toLowerCase().includes(p))) return false;
  const base = path.split("/").pop() || "";
  const ext = extOf(base);
  return TEXT_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(base.toLowerCase());
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max) + `\n...(کوتاه‌شده، ${str.length - max} کاراکتر بیشتر بود)`;
}

/**
 * Turn an uploaded zip buffer into a text summary the AI can review.
 * @returns {Promise<string|null>} null if nothing readable was found
 */
async function summarizeZip(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files).filter((f) => !f.dir);

  const tree = entries.map((f) => f.name).slice(0, 200);
  const readable = entries.filter((f) => isReadable(f.name)).slice(0, MAX_FILES);

  if (!readable.length) {
    return `ساختار فایل zip:\n${tree.join("\n")}\n\n(فایل متنی/کد قابل‌خوندنی توش پیدا نکردم — شاید فقط شامل فایل باینری/تصویره.)`;
  }

  let used = 0;
  const parts = [];
  for (const entry of readable) {
    if (used >= MAX_TOTAL_CHARS) break;
    let content;
    try {
      content = await entry.async("string");
    } catch {
      continue;
    }
    const budget = Math.min(MAX_CHARS_PER_FILE, MAX_TOTAL_CHARS - used);
    const clipped = truncate(content, budget);
    used += clipped.length;
    parts.push(`### ${entry.name}\n\`\`\`\n${clipped}\n\`\`\``);
  }

  return `ساختار فایل zip (${entries.length} فایل):\n${tree.join("\n")}\n\nمحتوای فایل‌های قابل‌خوندن:\n\n${parts.join("\n\n")}`;
}

function summarizePlainFile(buffer, filename) {
  const ext = extOf(filename);
  if (!TEXT_EXTENSIONS.has(ext) && !TEXT_EXTENSIONS.has(filename.toLowerCase())) {
    return null;
  }
  const text = buffer.toString("utf-8");
  return `فایل: ${filename}\n\`\`\`\n${truncate(text, MAX_TOTAL_CHARS)}\n\`\`\``;
}

/**
 * @param {Buffer} buffer - downloaded file content
 * @param {string} filename
 * @param {string} [mimeType]
 * @returns {Promise<string|null>} formatted text for the AI, or null if unsupported/too large
 */
async function summarizeUploadedFile(buffer, filename, mimeType = "") {
  if (buffer.length > MAX_INPUT_BYTES) return null;

  const isZip =
    filename.toLowerCase().endsWith(".zip") ||
    mimeType.includes("zip") ||
    (buffer[0] === 0x50 && buffer[1] === 0x4b); // "PK" zip signature

  if (isZip) {
    try {
      return await summarizeZip(buffer);
    } catch {
      return null;
    }
  }

  return summarizePlainFile(buffer, filename);
}

module.exports = { summarizeUploadedFile };
