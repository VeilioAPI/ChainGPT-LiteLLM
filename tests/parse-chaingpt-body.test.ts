import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChainGptBody } from "../src/chaingpt/client.ts";

describe("parseChainGptBody", () => {
  it("extracts bot field from JSON", () => {
    assert.equal(parseChainGptBody('{"bot":"hello"}'), "hello");
  });

  it("concatenates SSE data payloads", () => {
    const body = [
      'data: {"bot":"Hel"}',
      'data: {"bot":"lo"}',
      "data: [DONE]",
    ].join("\n");
    assert.equal(parseChainGptBody(body), "Hello");
  });

  it("returns plain text fallback", () => {
    assert.equal(parseChainGptBody("raw answer"), "raw answer");
  });
});
