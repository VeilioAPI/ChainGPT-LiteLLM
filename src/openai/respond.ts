export type ChatCompletionRequest = {
  model?: string;
  messages: Array<{
    role: string;
    content?: string | Array<{ type?: string; text?: string }> | null;
  }>;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
};

export type ChatCompletionResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export function openaiError(
  message: string,
  type = "invalid_request_error",
  code?: string,
) {
  return {
    error: {
      message,
      type,
      param: null,
      code: code ?? null,
    },
  };
}

export function completionId(): string {
  return `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function buildCompletion(
  model: string,
  content: string,
): ChatCompletionResponse {
  return {
    id: completionId(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

export function sseChunk(
  id: string,
  model: string,
  delta: { role?: string; content?: string },
  finishReason: string | null = null,
): string {
  const payload = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}
