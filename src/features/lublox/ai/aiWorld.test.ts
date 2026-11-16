import { describe, expect, it } from "vitest";
import { aiUserMessage, MAX_AI_BLOCKS, MAX_AI_REPLY, parseAiWorld } from "./aiWorld";

describe("Lublox AI helper reply", () => {
  it("keeps valid blocks and drops invalid ones one by one", () => {
    const out = parseAiWorld({
      reply: "Added a jump.",
      blocks: [
        { kind: "platform", x: 0, y: 0, z: 0 },
        { kind: "script", x: 0, y: 0, z: 0 },
        { kind: "goal", x: 1, y: 2, z: 3, size: [4, 1, 4] },
        { kind: "platform", x: 999, y: 0, z: 0 },
      ],
    });
    expect(out.reply).toBe("Added a jump.");
    expect(out.blocks).toEqual([
      { kind: "platform", x: 0, y: 0, z: 0 },
      { kind: "goal", x: 1, y: 2, z: 3, size: [4, 1, 4] },
    ]);
  });

  it("caps the world at 200 blocks and the reply length", () => {
    const blocks = Array.from({ length: 250 }, () => ({ kind: "platform", x: 0, y: 0, z: 0 }));
    const out = parseAiWorld({ reply: "x".repeat(900), blocks });
    expect(out.blocks).toHaveLength(MAX_AI_BLOCKS);
    expect(out.reply).toHaveLength(MAX_AI_REPLY);
  });

  it("returns no blocks when nothing is usable, and throws on a bad shape", () => {
    expect(parseAiWorld({ reply: "", blocks: [{ kind: "nope" }] }).blocks).toEqual([]);
    expect(() => parseAiWorld({ reply: 5, blocks: [] })).toThrow(TypeError);
    expect(() => parseAiWorld(null)).toThrow(TypeError);
  });

  it("puts the current world and the request in the user turn", () => {
    const msg = aiUserMessage("add a lava pit", [{ kind: "platform", x: 0, y: 0, z: 0 }]);
    expect(msg).toContain('"kind":"platform"');
    expect(msg.endsWith("Request: add a lava pit")).toBe(true);
  });
});
