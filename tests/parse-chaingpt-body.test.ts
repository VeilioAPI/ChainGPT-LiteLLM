import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ChainGptApiError,
  parseChainGptBody,
} from "../src/chaingpt/parse-response.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures/chaingpt");

describe("parseChainGptBody", () => {
  it("extracts data.bot from documented buffered JSON", () => {
    const raw = readFileSync(join(fixtures, "buffered-success.json"), "utf8");
    assert.equal(
      parseChainGptBody(raw),
      "A reentrancy guard prevents reentrant calls to a function.",
    );
  });

  it("throws on status:false buffered JSON", () => {
    const raw = readFileSync(join(fixtures, "buffered-error.json"), "utf8");
    assert.throws(() => parseChainGptBody(raw), ChainGptApiError);
  });

  it("concatenates SSE data payloads", () => {
    const body = [
      'data: {"data":{"bot":"Hel"}}',
      'data: {"data":{"bot":"lo"}}',
      "data: [DONE]",
    ].join("\n");
    assert.equal(parseChainGptBody(body), "Hello");
  });

  it("returns plain text fallback", () => {
    assert.equal(parseChainGptBody("raw answer"), "raw answer");
  });
});
