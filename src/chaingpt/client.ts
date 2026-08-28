import type { Config } from "../config.js";

export type ChainGptChatResult = {
  content: string;
  rawStatus: number;
};

/**
 * Call ChainGPT Web3 LLM chat/stream and buffer the full assistant text.
 * Streaming relay to OpenAI SSE is handled at the route layer for v0
 * by buffering then emitting chunks (simple, correct); true byte-relay can follow.
 */
export async function chaingptChat(
  config: Config,
  question: string,
  model = "general_assistant",
): Promise<ChainGptChatResult> {
  const url = `${config.chaingptBaseUrl}/chat/stream`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.chaingptApiKey}`,
      "api-key": config.chaingptApiKey,
    },
    body: JSON.stringify({
      model,
      question,
      chatHistory: config.chatHistory,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(
      `ChainGPT upstream error ${res.status}: ${text.slice(0, 200)}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  const content = parseChainGptBody(text);
  return { content, rawStatus: res.status };
}

/**
 * ChainGPT may return SSE, NDJSON, or plain text depending on path/SDK.
 * Be defensive: extract readable assistant text.
 */
export function parseChainGptBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";

  // SSE: data: {...}
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

  // Single JSON object
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as Record<string, unknown>;
      const extracted = extractTextFromJson(j);
      if (extracted) return extracted;
    } catch {
      /* fall through */
    }
  }

  return trimmed;
}

function extractTextFromJson(j: Record<string, unknown>): string {
  if (typeof j.bot === "string") return j.bot;
  if (typeof j.answer === "string") return j.answer;
  if (typeof j.response === "string") return j.response;
  if (typeof j.content === "string") return j.content;
  if (typeof j.message === "string") return j.message;
  if (typeof j.data === "string") return j.data;
  if (j.data && typeof j.data === "object") {
    const d = j.data as Record<string, unknown>;
    if (typeof d.bot === "string") return d.bot;
    if (typeof d.answer === "string") return d.answer;
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
