export type ChatMessage = {
  role: string;
  content?: string | Array<{ type?: string; text?: string }> | null;
  name?: string;
};

function contentToText(content: ChatMessage["content"]): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => p && (p.type === "text" || p.text))
      .map((p) => p.text ?? "")
      .join("");
  }
  return "";
}

/**
 * Flatten OpenAI-style messages into a single ChainGPT `question` string.
 */
export function messagesToQuestion(messages: ChatMessage[]): string {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages must be a non-empty array");
  }

  const onlyUser =
    messages.length === 1 && messages[0].role === "user"
      ? contentToText(messages[0].content).trim()
      : null;
  if (onlyUser) return onlyUser;

  const parts: string[] = [];
  for (const m of messages) {
    const text = contentToText(m.content).trim();
    if (!text) continue;
    const role = (m.role || "user").toLowerCase();
    if (role === "system") parts.push(`System: ${text}`);
    else if (role === "assistant") parts.push(`Assistant: ${text}`);
    else if (role === "tool" || role === "function")
      parts.push(`Tool: ${text}`);
    else parts.push(`User: ${text}`);
  }

  const question = parts.join("\n").trim();
  if (!question) throw new Error("messages produced an empty question");
  return question;
}
