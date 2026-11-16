import { describe, expect, it } from "vitest";
import { canPickUp, worldSchema } from "@/features/lublox/lublox";
describe("lublox weapons and vehicles", () => {
  it("picks up a weapon only when close", () => {
    expect(canPickUp({ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 })).toBe(true);
    expect(canPickUp({ x: 0, y: 1, z: 0 }, { x: 3, y: 1, z: 0 })).toBe(false);
  });
  it("accepts custom-colored cars and swords but rejects bad colors", () => {
    expect(worldSchema.safeParse([{ kind: "lambo", x: 0, y: 0, z: 0, color: "#ff0000" }]).success).toBe(true);
    expect(worldSchema.safeParse([{ kind: "sword", x: 0, y: 1, z: 0, color: "red" }]).success).toBe(false);
  });
  it("accepts every vehicle and weapon kind and rejects unknown kinds", () => {
    for (const kind of ["car", "lambo", "ebike", "sword", "gun"]) expect(worldSchema.safeParse([{ kind, x: 0, y: 1, z: 0 }]).success).toBe(true);
    expect(worldSchema.safeParse([{ kind: "tank", x: 0, y: 1, z: 0 }]).success).toBe(false);
  });
});
