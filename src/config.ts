export type Config = {
  chaingptApiKey: string;
  chaingptBaseUrl: string;
  host: string;
  port: number;
  chatHistory: "on" | "off";
  maxCreditsPerJob: number | null;
  logLevel: "debug" | "info" | "warn";
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function loadConfig(): Config {
  const maxRaw = process.env.MAX_CREDITS_PER_JOB?.trim();
  const maxCreditsPerJob =
    maxRaw && Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : null;

  const chatHistory =
    process.env.CHAINGPT_CHAT_HISTORY?.trim().toLowerCase() === "on"
      ? "on"
      : "off";

  const logLevelRaw = process.env.LOG_LEVEL?.trim().toLowerCase();
  const logLevel: Config["logLevel"] =
    logLevelRaw === "debug" || logLevelRaw === "warn" ? logLevelRaw : "info";

  return {
    chaingptApiKey: requireEnv("CHAINGPT_API_KEY"),
    chaingptBaseUrl: (
      process.env.CHAINGPT_BASE_URL?.trim() || "https://api.chaingpt.org"
    ).replace(/\/$/, ""),
    host: process.env.ADAPTER_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.ADAPTER_PORT || "8787") || 8787,
    chatHistory,
    maxCreditsPerJob,
    logLevel,
  };
}
