import { describe, expect, it } from "vitest";
import { APPS, findApp } from "./registry";

describe("app registry", () => {
  it("has unique app ids", () => {
    const ids = APPS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every game window a per-game key and a readable title", () => {
    const game = findApp("game");
    expect(game?.windowKey?.({ gameId: "abc" })).toBe("game:abc");
    expect(game?.windowTitle?.({ gameId: "abc", name: "Tiny Tank" })).toBe("Tiny Tank");
  });

  it("docks the main apps and keeps the game window out of the dock", () => {
    expect(findApp("stem")?.dock).toBe(true);
    expect(findApp("game")?.dock).toBe(false);
  });

  it("returns undefined for an unknown app", () => {
    expect(findApp("nope")).toBeUndefined();
  });
});
