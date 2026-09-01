import { createMiddleware } from "hono/factory";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const id = c.req.header(REQUEST_ID_HEADER) || randomUUID();
  c.set("requestId", id);
  c.header(REQUEST_ID_HEADER, id);
  await next();
});

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}
