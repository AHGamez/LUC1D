import { describe, expect, it } from "vitest";
import { cameraRelative, LBX_ITEMS, movement, shouldMountLublox, STARTER, worldSchema } from "./lublox";

describe("Lublox", () => {
  it("unloads the player when it is not the active app", () => {
    expect(shouldMountLublox("lublox", "discard")).toBe(false);
    expect(shouldMountLublox("lublox", null)).toBe(false);
    expect(shouldMountLublox("lublox", "lublox")).toBe(true);
  });
  it("loads Studio separately and unloads it when inactive", () => {
    expect(shouldMountLublox("lublox-studio", "lublox")).toBe(false);
    expect(shouldMountLublox("lublox-studio", "lublox-studio")).toBe(true);
  });
  it("validates safe world data and rejects scripts and oversized worlds", () => {
    expect(worldSchema.safeParse(STARTER).success).toBe(true);
    expect(worldSchema.safeParse([{ kind: "script", x: 0, y: 0, z: 0 }]).success).toBe(false);
    expect(worldSchema.safeParse(Array(201).fill(STARTER[0])).success).toBe(false);
  });
  it("moves forward toward the fixed camera view and normalizes diagonals", () => {
    expect(movement(new Set(["KeyW"]))).toEqual({ x: 0, z: -1 });
    expect(movement(new Set(["KeyD"]))).toEqual({ x: 1, z: 0 });
    const diagonal = movement(new Set(["KeyW", "KeyD"]));
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1);
  });
});
import { cameraRelative as cr } from "./lublox";
import { test as t2, expect as e2 } from "vitest";
t2("forward follows camera yaw", () => {
  const f = cr({ x: 0, z: -1 }, Math.PI / 2);
  e2(f.x).toBeCloseTo(-1);
  e2(f.z).toBeCloseTo(0);
});

describe("Lublox avatar slots", () => {
  it("has hoodie, baggy jeans and a gift-only Santa hat", () => {
    expect(LBX_ITEMS.find((i) => i.id === "lbxshirt-hoodie")?.slot).toBe("shirt");
    expect(LBX_ITEMS.find((i) => i.id === "lbxpants-baggy")?.slot).toBe("pants");
    expect(LBX_ITEMS.find((i) => i.id === "lbxhat-santa")?.gift).toBe(true);
  });
});

describe("camera-relative movement", () => {
  it("forward follows camera yaw", () => {
    const f = cameraRelative({ x: 0, z: -1 }, Math.PI / 2);
    expect(f.x).toBeCloseTo(-1);
    expect(f.z).toBeCloseTo(0);
  });
});
