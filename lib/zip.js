const JSZip = require("jszip");

/**
 * Build a zip buffer from an array of { path, content } file descriptors.
 * @param {Array<{path: string, content: string}>} files
 * @returns {Promise<Buffer>}
 */
async function buildZip(files) {
  const zip = new JSZip();
  for (const file of files) {
    // Guard against absolute paths / path traversal from model output.
    const safePath = file.path.replace(/^([./\\]+)/, "").replace(/\.\.[/\\]/g, "");
    zip.file(safePath || "file.txt", file.content ?? "");
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

module.exports = { buildZip };
