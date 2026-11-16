import { describe, expect, it } from "vitest";
import { chooseIt, findTagTarget } from "./lublox-tag";

describe("lublox tag", () => {
  it("does not start with only one player", () => {
    expect(chooseIt(["a"], null)).toBeNull();
  });
  it("starts once two players are active", () => {
    expect(chooseIt(["b", "a"], null)).toBe("a");
  });
  it("keeps the current it while they stay", () => {
    expect(chooseIt(["a", "b"], "b")).toBe("b");
  });
  it("tags only players within range", () => {
    const me = { x: 0, y: 0, z: 0 };
    expect(findTagTarget(me, [{ id: "far", pos: { x: 5, y: 0, z: 0 } }])).toBeNull();
    expect(findTagTarget(me, [{ id: "near", pos: { x: 1, y: 0, z: 0 } }])).toBe("near");
  });
});
