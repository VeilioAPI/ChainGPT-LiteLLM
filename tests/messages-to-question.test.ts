import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { messagesToQuestion } from "../src/mapping/messages-to-question.ts";

describe("messagesToQuestion", () => {
  it("returns plain user content when single user message", () => {
    assert.equal(
      messagesToQuestion([{ role: "user", content: "ping" }]),
      "ping",
    );
  });

  it("prefixes roles for multi-turn", () => {
    const q = messagesToQuestion([
      { role: "system", content: "Be brief." },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Next?" },
    ]);
    assert.equal(
      q,
      "System: Be brief.\nUser: Hello\nAssistant: Hi\nUser: Next?",
    );
  });

  it("flattens text parts", () => {
    assert.equal(
      messagesToQuestion([
        {
          role: "user",
          content: [
            { type: "text", text: "A" },
            { type: "text", text: "B" },
          ],
        },
      ]),
      "AB",
    );
  });

  it("throws on empty messages", () => {
    assert.throws(() => messagesToQuestion([]), /non-empty/);
  });
});
