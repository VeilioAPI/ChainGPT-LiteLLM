import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig } from "../../src/config.js";
import { createApp } from "../../src/server.js";

const fixtures = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/chaingpt",
);

function testConfig() {
  process.env.CHAINGPT_API_KEY = "test-key";
  return loadConfig();
}

describe("integration /v1/chat/completions", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  it("returns OpenAI-shaped completion on upstream success", async () => {
    const upstreamBody = readFileSync(
      join(fixtures, "buffered-success.json"),
      "utf8",
    );
    globalThis.fetch = mock.fn(async () =>
      Response.json(JSON.parse(upstreamBody)),
    ) as typeof fetch;

    const app = createApp(testConfig());
    const res = await app.request("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "general_assistant",
        messages: [{ role: "user", content: "What is a reentrancy guard?" }],
        stream: false,
      }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    assert.match(
      json.choices[0].message.content,
      /reentrancy guard/i,
    );
    assert.ok(res.headers.get("x-request-id"));
  });

  it("returns 501 when tools are present", async () => {
    const app = createApp(testConfig());
    const res = await app.request("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "general_assistant",
        messages: [{ role: "user", content: "hi" }],
        tools: [{ type: "function", function: { name: "ping" } }],
      }),
    });
    assert.equal(res.status, 501);
  });

  it("returns 400 for unsupported model", async () => {
    const app = createApp(testConfig());
    const res = await app.request("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    assert.equal(res.status, 400);
  });

  it("maps upstream 401 to 502", async () => {
    globalThis.fetch = mock.fn(async () =>
      new Response(
        JSON.stringify({ status: false, message: "Invalid API key" }),
        { status: 401 },
      ),
    ) as typeof fetch;

    const app = createApp(testConfig());
    const res = await app.request("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "general_assistant",
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    assert.equal(res.status, 502);
  });
});

describe("integration /health", () => {
  it("returns ok without probe", async () => {
    process.env.CHAINGPT_API_KEY = "test-key";
    const app = createApp(loadConfig());
    const res = await app.request("/health");
    assert.equal(res.status, 200);
    const json = (await res.json()) as { ok: boolean; probe: boolean };
    assert.equal(json.ok, true);
    assert.equal(json.probe, false);
  });
});
