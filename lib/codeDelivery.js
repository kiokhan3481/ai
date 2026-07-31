const { sendMessage, sendDocument } = require("./telegram");
const { extractProjectFiles, extractCodeBlocks, totalCodeLength, buildLooseFiles } = require("./codeExtract");
const { buildZip } = require("./zip");

// Auto-attach a downloadable file when a plain chat reply contains at least
// this much code, even if the user didn't explicitly ask for a file.
const AUTO_FILE_THRESHOLD = 500;

function slugify(name) {
  return (name || "project")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

/**
 * Looks at an assistant reply and, if it contains a multi-file project or a
 * sizeable code snippet, delivers it to the chat as a document/zip.
 *
 * @param {number|string} chatId
 * @param {string} text - the assistant reply to scan
 * @param {object} opts
 * @param {boolean} [opts.force] - send even if below the auto-threshold
 *   (used when the user explicitly asks "send that as a file")
 * @returns {Promise<{isProject: boolean, sent: boolean}>}
 */
async function deliverCodeIfAny(chatId, text, opts = {}) {
  // --- Case 1: multi-file project protocol ---------------------------------
  const { projectName, files, narrative } = extractProjectFiles(text);

  if (files.length > 0) {
    const zipName = `${slugify(projectName)}.zip`;
    const buffer = await buildZip(files);
    await sendDocument(
      chatId,
      buffer,
      zipName,
      `📦 پروژه شامل ${files.length} فایل`,
      "application/zip"
    );
    await sendMessage(chatId, narrative || "پروژه آماده‌ست — فایل بالا رو دانلود کن و بازش کن.");
    return { isProject: true, sent: true };
  }

  // --- Case 2: loose/quick code snippets -------------------------------------
  const blocks = extractCodeBlocks(text);
  if (!blocks.length) return { isProject: false, sent: false };

  const shouldSend = opts.force || totalCodeLength(blocks) >= AUTO_FILE_THRESHOLD;
  if (!shouldSend) return { isProject: false, sent: false };

  const looseFiles = buildLooseFiles(blocks);
  if (looseFiles.length === 1) {
    await sendDocument(chatId, looseFiles[0].content, looseFiles[0].path, "📄 کد به‌صورت فایل");
  } else {
    const buffer = await buildZip(looseFiles);
    await sendDocument(chatId, buffer, "code.zip", `📦 ${looseFiles.length} فایل کد`, "application/zip");
  }
  return { isProject: false, sent: true };
}

module.exports = { deliverCodeIfAny, AUTO_FILE_THRESHOLD };
