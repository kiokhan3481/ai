// Groq does not offer an image-generation endpoint, so image requests are
// routed to Pollinations.ai — a free, no-API-key image generation service.
// It works by building a URL; Pollinations renders the image on request,
// and Telegram's sendPhoto can consume that URL directly.
//
// If you'd rather use a paid/higher-quality provider (e.g. OpenAI's
// gpt-image-1, or Stability AI), swap the implementation of
// buildImageUrl()/generateImage() below and add the relevant API key
// as a Vercel environment variable.

function buildImageUrl(prompt, opts = {}) {
  const width = opts.width || 1024;
  const height = opts.height || 1024;
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

// Simple heuristic to detect "make me an image of ..." style requests.
// This is intentionally conservative — an explicit /image command always
// works regardless of this function's result.
function looksLikeImageRequest(text) {
  const patterns = [
    /^\/image\b/i,
    /^\/img\b/i,
    /(بساز|تولید کن|رسم کن).*(عکس|تصویر)/i,
    /(عکس|تصویر).*(بساز|تولید کن|رسم کن)/i,
    /\b(draw|generate an? image|create an? image|make an? image|paint)\b/i,
  ];
  return patterns.some((re) => re.test(text));
}

function extractImagePrompt(text) {
  return text
    .replace(/^\/(image|img)\b\s*/i, "")
    .replace(/^(یک\s+)?(عکس|تصویر)\s+از\s+/i, "")
    .trim();
}

module.exports = { buildImageUrl, looksLikeImageRequest, extractImagePrompt };
