import type { Hono } from "hono";
import type { Config } from "../config.js";
import { chaingptProbe } from "../chaingpt/client.js";
import { VERSION } from "../version.js";

export function registerHealthRoutes(app: Hono, config: Config): void {
  app.get("/health", async (c) => {
    const probe = c.req.query("probe") === "1";
    const base = {
      ok: true,
      upstream: "chaingpt",
      version: VERSION,
      probe,
    };

    if (!probe) return c.json(base);

    const result = await chaingptProbe(config);
    return c.json({
      ...base,
      ok: result.ok,
      upstreamOk: result.ok,
      probeLatencyMs: result.latencyMs,
      upstreamError: result.error,
    });
  });
}
