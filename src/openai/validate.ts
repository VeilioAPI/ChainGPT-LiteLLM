import type { ChatCompletionRequest } from "./respond.js";
import { isSupportedModel } from "./models.js";

export function validateChatRequest(body: ChatCompletionRequest): string | null {
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return "messages is required and must be a non-empty array";
  }
  if (body.model && !isSupportedModel(body.model)) {
    return `unsupported model: ${body.model} (supported: general_assistant)`;
  }
  return null;
}
