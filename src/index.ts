#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createApp } from "./server.js";

const config = loadConfig();
const app = createApp(config);

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(
    JSON.stringify({
      event: "listen",
      host: config.host,
      port: info.port,
      base: `http://${config.host}:${info.port}/v1`,
    }),
  );
});
