import type { Hono } from "hono";
import { DEFAULT_MODEL } from "../openai/models.js";

export function registerModelRoutes(app: Hono): void {
  app.get("/v1/models", (c) =>
    c.json({
      object: "list",
      data: [
        {
          id: DEFAULT_MODEL,
          object: "model",
          created: 0,
          owned_by: "chaingpt",
        },
      ],
    }),
  );
}
