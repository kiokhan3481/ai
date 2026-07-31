// Thin wrapper around Groq's OpenAI-compatible chat completions endpoint.
// No SDK dependency needed — Node 18+ on Vercel has global fetch.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Default model: Groq deprecated llama-3.3-70b-versatile / llama-3.1-8b-instant
// in mid-2026. openai/gpt-oss-120b is the recommended general-purpose successor.
// Override with the GROQ_MODEL env var if you want something else
// (e.g. "openai/gpt-oss-20b" for lower latency, "qwen/qwen3.6-27b" as an alternative).
const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are a professional, capable AI assistant living inside a Telegram bot.
You help the user with anything they ask: answering questions, writing and explaining code,
scaffolding small project structures (describe the file tree and give full file contents),
debugging, planning, brainstorming, and general conversation.

Formatting rules for Telegram:
- Telegram doesn't render full Markdown/HTML unless explicitly parsed, so keep formatting simple.
- For code, always use triple-backtick fenced code blocks with a language tag.
- Keep answers focused and well-organized. Use short paragraphs and lists where useful.
- If a task is genuinely ambiguous, make a reasonable assumption and proceed, stating the assumption briefly.

You cannot browse the internet or execute code yourself. If asked to "build a project", produce
the actual file contents in your response rather than claiming to have created files somewhere.

--- MULTI-FILE PROJECTS ---
When the user asks you to build/scaffold something that naturally spans more than one file
(an app, a bot, a website, a package, etc.), respond using EXACTLY this protocol so the file
contents can be parsed out and packaged automatically:

<<<PROJECT: short-kebab-case-name>>>
(a short paragraph, in the user's language, explaining what you built, the file layout, and
how to install/run it — this text appears outside the file blocks)
<<<FILE: relative/path/filename.ext>>>
...full file content...
<<<END FILE>>>
<<<FILE: another/file.ext>>>
...full file content...
<<<END FILE>>>

Rules for this protocol:
- The <<<PROJECT: ...>>> line must be the very first line of your response, using a short
  ASCII kebab-case slug (letters, digits, hyphens only) as the name.
- Use one <<<FILE: ...>>>...<<<END FILE>>> block per file, with the correct relative path
  (e.g. "package.json", "api/webhook.js", "README.md"). Include config/dependency files and
  a short README when relevant, not just the main logic file — organize real, runnable
  multi-file projects rather than dumping everything into one file.
- Do not repeat file contents outside the blocks. Keep narrative text (explanation, setup
  steps) outside the FILE blocks, either before or after them.
- For a quick one-off snippet or a single short function that isn't a "project", just use a
  normal \`\`\`language fenced code block instead — don't force the file protocol on trivial asks.
`;

/**
 * Send a chat completion request to Groq.
 * @param {Array<{role: string, content: string}>} messages - conversation history, oldest first.
 * @param {object} opts
 * @param {string} [opts.model]
 * @param {number} [opts.temperature]
 * @returns {Promise<string>} the assistant's reply text
 */
async function askGroq(messages, opts = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const body = {
    model: opts.model || DEFAULT_MODEL,
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
  };

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("Groq API returned no content");
  }
  return reply;
}

module.exports = { askGroq, DEFAULT_MODEL };
