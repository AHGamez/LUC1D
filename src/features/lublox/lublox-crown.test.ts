import { describe, expect, it } from "vitest";
import { canStealCrown, pickMode, randomKing } from "./lublox-tag";

describe("Grassy Plains mode voting", () => {
  it("picks crown when it has the most votes", () => expect(pickMode(["crown", "crown", "tag"])).toBe("crown"));
  it("keeps tag on a tie", () => expect(pickMode(["crown", "tag"])).toBe("tag"));
});
describe("crown mode", () => {
  it("needs 2 players to pick a king", () => expect(randomKing(["a"])).toBeNull());
  it("picks a random player", () => expect(randomKing(["a", "b", "c"], () => 0.5)).toBe("b"));
  it("steals the crown only up close", () => {
    expect(canStealCrown({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(true);
    expect(canStealCrown({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })).toBe(false);
  });
});
