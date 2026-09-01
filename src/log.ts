import type { Config } from "./config.js";

export type LogFields = Record<string, unknown>;

export function log(
  config: Config,
  level: "debug" | "info" | "warn" | "error",
  fields: LogFields,
): void {
  const order = { debug: 0, info: 1, warn: 2, error: 3 };
  if (order[level] < order[config.logLevel === "debug" ? "debug" : config.logLevel]) {
    return;
  }
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
