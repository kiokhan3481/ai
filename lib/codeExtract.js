// Parses assistant replies for two kinds of code content:
//
// 1. Multi-file "project" responses, using a protocol we ask Groq to follow
//    in the system prompt:
//
//      <<<PROJECT: my-bot-name>>>
//      (narrative text explaining the project)
//      <<<FILE: package.json>>>
//      { ... }
//      <<<END FILE>>>
//      <<<FILE: index.js>>>
//      ...
//      <<<END FILE>>>
//
// 2. Ordinary single/loose ``` fenced code blocks with a language tag,
//    for quick snippets that aren't a full project.

const FILE_BLOCK_RE = /<<<FILE:\s*([^\n>]+?)\s*>>>\r?\n([\s\S]*?)<<<END FILE>>>/g;
const PROJECT_NAME_RE = /<<<PROJECT:\s*([a-zA-Z0-9_-]+)\s*>>>\r?\n?/;

const EXT_MAP = {
  js: "js",
  javascript: "js",
  jsx: "jsx",
  ts: "ts",
  typescript: "ts",
  tsx: "tsx",
  py: "py",
  python: "py",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  cs: "cs",
  csharp: "cs",
  go: "go",
  golang: "go",
  rs: "rs",
  rust: "rs",
  php: "php",
  rb: "rb",
  ruby: "rb",
  sql: "sql",
  html: "html",
  css: "css",
  scss: "scss",
  json: "json",
  yaml: "yml",
  yml: "yml",
  sh: "sh",
  bash: "sh",
  shell: "sh",
  md: "md",
  markdown: "md",
  swift: "swift",
  kotlin: "kt",
  kt: "kt",
  dart: "dart",
  txt: "txt",
};

function extToLang(lang) {
  return EXT_MAP[(lang || "").toLowerCase().trim()] || "txt";
}

/** Extract a multi-file project (if the reply used the protocol). */
function extractProjectFiles(text) {
  const nameMatch = text.match(PROJECT_NAME_RE);
  const projectName = nameMatch ? nameMatch[1] : null;
  const withoutNameTag = text.replace(PROJECT_NAME_RE, "");

  const files = [];
  const re = new RegExp(FILE_BLOCK_RE);
  let match;
  while ((match = re.exec(withoutNameTag)) !== null) {
    const path = match[1].trim();
    const content = match[2].replace(/^\n/, "").replace(/\n$/, "");
    files.push({ path, content });
  }

  const narrative = withoutNameTag
    .replace(new RegExp(FILE_BLOCK_RE), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { projectName, files, narrative };
}

/** Extract ordinary ``` fenced code blocks (no file-path protocol). */
function extractCodeBlocks(text) {
  const re = /```(\w+)?\r?\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const code = match[2].replace(/\n$/, "");
    if (code.trim()) blocks.push({ lang: match[1] || "", code });
  }
  return blocks;
}

function totalCodeLength(blocks) {
  return blocks.reduce((sum, b) => sum + b.code.length, 0);
}

function buildLooseFiles(blocks, baseName = "snippet") {
  return blocks.map((b, i) => ({
    path: blocks.length > 1 ? `${baseName}${i + 1}.${extToLang(b.lang)}` : `${baseName}.${extToLang(b.lang)}`,
    content: b.code,
  }));
}

// Recognizes Persian/English follow-up requests like "بفرستش به صورت فایل"
// asking to (re)send the previous code as a downloadable file.
const FILE_REQUEST_PATTERNS = [
  /به\s*صورت\s*فایل/,
  /فایلش/,
  /فایل\s*بده/,
  /فایل\s*بفرست/,
  /zip\s*کن/i,
  /دانلود/,
  /send\s+(it\s+)?as\s+a?\s*file/i,
  /download\s+(it|this)/i,
];

function looksLikeFileRequest(text) {
  return FILE_REQUEST_PATTERNS.some((re) => re.test(text));
}

module.exports = {
  extractProjectFiles,
  extractCodeBlocks,
  totalCodeLength,
  buildLooseFiles,
  extToLang,
  looksLikeFileRequest,
};
