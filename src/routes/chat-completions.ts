import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { Config } from "../config.js";
import { ChainGptApiError, chaingptChat } from "../chaingpt/client.js";
import { log } from "../log.js";
import { messagesToQuestion } from "../mapping/messages-to-question.js";
import { normalizeModel } from "../openai/models.js";
import {
  buildCompletion,
  completionId,
  openaiError,
  sseChunk,
  type ChatCompletionRequest,
} from "../openai/respond.js";
import { validateChatRequest } from "../openai/validate.js";

export function registerChatRoutes(app: Hono, config: Config): void {
  app.post("/v1/chat/completions", async (c) => {
    const requestId = c.get("requestId");
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

    const validationError = validateChatRequest(body);
    if (validationError) {
      return c.json(openaiError(validationError), 400);
    }

    let question: string;
    try {
      question = messagesToQuestion(body.messages);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid messages";
      return c.json(openaiError(msg), 400);
    }

    const model = normalizeModel(body.model);
    const started = Date.now();

    try {
      const { content } = await chaingptChat(config, question, model);
      const latencyMs = Date.now() - started;

      log(config, "info", {
        request_id: requestId,
        route: "/v1/chat/completions",
        stream: Boolean(body.stream),
        latency_ms: latencyMs,
        ok: true,
        model,
      });

      if (config.logLevel === "debug") {
        log(config, "debug", {
          request_id: requestId,
          question_chars: question.length,
        });
      }

      if (body.stream) {
        const id = completionId();
        return streamSSE(c, async (stream) => {
          const writeChunk = async (
            delta: { role?: string; content?: string },
            finishReason: string | null = null,
          ) => {
            await stream.writeSSE({
              data: JSON.stringify({
                id,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [{ index: 0, delta, finish_reason: finishReason }],
              }),
            });
          };

          await writeChunk({ role: "assistant" });
          const size = 48;
          for (let i = 0; i < content.length; i += size) {
            await writeChunk({ content: content.slice(i, i + size) });
          }
          await writeChunk({}, "stop");
          await stream.writeSSE({ data: "[DONE]" });
        });
      }

      return c.json(buildCompletion(model, content));
    } catch (e) {
      const upstreamStatus =
        e instanceof ChainGptApiError ? e.status : 502;
      const message =
        e instanceof Error ? e.message : "upstream error";

      log(config, "error", {
        request_id: requestId,
        route: "/v1/chat/completions",
        ok: false,
        upstream_status: upstreamStatus,
        message: message.slice(0, 200),
      });

      const http =
        upstreamStatus === 429
          ? 429
          : upstreamStatus === 401 || upstreamStatus === 403
            ? 502
            : upstreamStatus >= 400 && upstreamStatus < 600
              ? 502
              : 502;

      return c.json(
        openaiError(message, "api_error", "upstream_error"),
        http as 429 | 502,
      );
    }
  });
}
