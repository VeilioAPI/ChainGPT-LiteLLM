import type { Config } from "../config.js";
import {
  ChainGptApiError,
  parseChainGptBody,
} from "./parse-response.js";

export type ChainGptChatResult = {
  content: string;
  rawStatus: number;
};

const UPSTREAM_TIMEOUT_MS = 60_000;

export type ChainGptRequest = {
  model: string;
  question: string;
  chatHistory: "on" | "off";
};

export function buildChainGptHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function chaingptChat(
  config: Config,
  question: string,
  model = "general_assistant",
  signal?: AbortSignal,
): Promise<ChainGptChatResult> {
  const url = `${config.chaingptBaseUrl}/chat/stream`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildChainGptHeaders(config.chaingptApiKey),
      body: JSON.stringify({
        model,
        question,
        chatHistory: config.chatHistory,
      } satisfies ChainGptRequest),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new ChainGptApiError(
        res.status,
        sanitizeUpstreamMessage(res.status, text),
        text.slice(0, 500),
      );
    }

    const content = parseChainGptBody(text);
    if (!content) {
      throw new ChainGptApiError(
        502,
        "ChainGPT returned an empty response body",
        text.slice(0, 500),
      );
    }

    return { content, rawStatus: res.status };
  } catch (e) {
    if (e instanceof ChainGptApiError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new ChainGptApiError(504, "ChainGPT upstream request timed out");
    }
    throw new ChainGptApiError(
      502,
      e instanceof Error ? e.message : "upstream network error",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Minimal upstream ping for health probe. */
export async function chaingptProbe(config: Config): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const started = Date.now();
  try {
    await chaingptChat(config, "ping", "general_assistant");
    return { ok: true, latencyMs: Date.now() - started };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message.slice(0, 200) : "probe failed",
    };
  }
}

function sanitizeUpstreamMessage(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as Record<string, unknown>;
    if (typeof j.message === "string") return `ChainGPT ${status}: ${j.message}`;
  } catch {
    /* ignore */
  }
  return `ChainGPT upstream error ${status}`;
}

export { parseChainGptBody, ChainGptApiError };
