export const DEFAULT_MODEL = "general_assistant";

const ALIASES: Record<string, string> = {
  general_assistant: DEFAULT_MODEL,
  "openai/general_assistant": DEFAULT_MODEL,
  "chaingpt/general_assistant": DEFAULT_MODEL,
};

export function normalizeModel(model?: string): string {
  if (!model?.trim()) return DEFAULT_MODEL;
  const key = model.trim();
  return ALIASES[key] ?? key;
}

export function isSupportedModel(model?: string): boolean {
  const normalized = normalizeModel(model);
  return normalized === DEFAULT_MODEL;
}
