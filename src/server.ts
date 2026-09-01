import { Hono } from "hono";
import type { Config } from "./config.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { registerChatRoutes } from "./routes/chat-completions.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerModelRoutes } from "./routes/models.js";

export function createApp(config: Config): Hono {
  const app = new Hono();
  app.use("*", requestIdMiddleware);
  registerHealthRoutes(app, config);
  registerModelRoutes(app);
  registerChatRoutes(app, config);
  return app;
}
