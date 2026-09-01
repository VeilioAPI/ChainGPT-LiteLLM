export class ChainGptApiError extends Error {
  readonly status: number;
  readonly upstreamBody: string;

  constructor(status: number, message: string, upstreamBody = "") {
    super(message);
    this.name = "ChainGptApiError";
    this.status = status;
    this.upstreamBody = upstreamBody;
  }
}

/**
 * Parse ChainGPT /chat/stream body.
 * Documented buffered shape: { status, message, data: { bot } }
 * Streaming may return concatenated text chunks or SSE lines.
 */
export function parseChainGptBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as Record<string, unknown>;
      if (j.status === false) {
        const msg =
          typeof j.message === "string"
            ? j.message
            : "ChainGPT returned status:false";
        throw new ChainGptApiError(502, msg, trimmed.slice(0, 500));
      }
      const extracted = extractTextFromJson(j);
      if (extracted) return extracted;
    } catch (e) {
      if (e instanceof ChainGptApiError) throw e;
      /* fall through */
    }
  }

  if (trimmed.includes("data:")) {
    const pieces: string[] = [];
    for (const line of trimmed.split(/\r?\n/)) {
      const m = line.match(/^data:\s*(.*)$/);
      if (!m) continue;
      const payload = m[1].trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload) as Record<string, unknown>;
        const extracted = extractTextFromJson(j);
        if (extracted) pieces.push(extracted);
      } catch {
        pieces.push(payload);
      }
    }
    const joined = pieces.join("");
    if (joined) return joined;
  }

  return trimmed;
}

function extractTextFromJson(j: Record<string, unknown>): string {
  if (typeof j.bot === "string") return j.bot;
  if (typeof j.answer === "string") return j.answer;
  if (typeof j.response === "string") return j.response;
  if (typeof j.content === "string") return j.content;
  if (typeof j.message === "string" && !("status" in j)) return j.message;
  if (typeof j.data === "string") return j.data;
  if (j.data && typeof j.data === "object") {
    const d = j.data as Record<string, unknown>;
    if (typeof d.bot === "string") return d.bot;
    if (typeof d.answer === "string") return d.answer;
    if (typeof d.content === "string") return d.content;
  }
  if (Array.isArray(j.choices)) {
    const c0 = j.choices[0] as Record<string, unknown> | undefined;
    const msg = c0?.message as Record<string, unknown> | undefined;
    if (typeof msg?.content === "string") return msg.content;
    const delta = c0?.delta as Record<string, unknown> | undefined;
    if (typeof delta?.content === "string") return delta.content;
  }
  return "";
}
