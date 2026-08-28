import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { Config } from "./config.js";
import { chaingptChat } from "./chaingpt/client.js";
import { messagesToQuestion } from "./mapping/messages-to-question.js";
import {
  buildCompletion,
  completionId,
  openaiError,
  sseChunk,
  type ChatCompletionRequest,
} from "./openai/respond.js";

const VERSION = "0.1.0";
const DEFAULT_MODEL = "general_assistant";

export function createApp(config: Config) {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      ok: true,
      upstream: "chaingpt",
      version: VERSION,
    }),
  );

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

  app.post("/v1/chat/completions", async (c) => {
    let body: ChatCompletionRequest;
    try {
      body = (await c.req.json()) as ChatCompletionRequest;
    } catch {
      return c.json(openaiError("Invalid JSON body"), 400);
    }

    if (body.tools || body.tool_choice) {
      return c.json(
        openaiError(
          "tools / tool_choice are not supported yet on this ChainGPT bridge (phase 2). See SPECS.md.",
          "not_supported_error",
          "tools_not_supported",
        ),
        501,
      );
    }

    let question: string;
    try {
      question = messagesToQuestion(body.messages ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid messages";
      return c.json(openaiError(msg), 400);
    }

    const model =
      !body.model || body.model === "openai/general_assistant"
        ? DEFAULT_MODEL
        : body.model;

    const started = Date.now();
    try {
      const { content } = await chaingptChat(config, question, DEFAULT_MODEL);
      const latency = Date.now() - started;
      if (config.logLevel !== "warn") {
        console.log(
          JSON.stringify({
            route: "/v1/chat/completions",
            stream: Boolean(body.stream),
            latency_ms: latency,
            ok: true,
            model,
          }),
        );
      }

      if (body.stream) {
        const id = completionId();
        return streamSSE(c, async (stream) => {
          const writeData = async (raw: string) => {
            // sseChunk already includes "data: ...\n\n"; strip for writeSSE
            const data = raw.replace(/^data:\s?/, "").replace(/\n\n$/, "");
            await stream.writeSSE({ data });
          };
          await writeData(sseChunk(id, model, { role: "assistant" }));
          const size = 48;
          for (let i = 0; i < content.length; i += size) {
            await writeData(
              sseChunk(id, model, { content: content.slice(i, i + size) }),
            );
          }
          await writeData(sseChunk(id, model, {}, "stop"));
          await stream.writeSSE({ data: "[DONE]" });
        });
      }

      return c.json(buildCompletion(model, content));
    } catch (e) {
      const status =
        e && typeof e === "object" && "status" in e
          ? Number((e as { status: number }).status)
          : 502;
      const message = e instanceof Error ? e.message : "upstream error";
      console.error(
        JSON.stringify({
          route: "/v1/chat/completions",
          ok: false,
          upstream_status: status,
          message: message.slice(0, 200),
        }),
      );
      const http = status === 429 ? 429 : status >= 400 && status < 600 ? 502 : 502;
      return c.json(
        openaiError(message, "api_error", "upstream_error"),
        http as 429 | 502,
      );
    }
  });

  return app;
}
