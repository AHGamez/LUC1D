import { describe, expect, it } from "vitest";
import { allFound, nearPresent, PRESENTS, snowActive } from "./lublox-xmas";
import { stepSleigh, type VehicleState } from "./lublox-vehicle";
describe("lublox xmas", () => {
  it("snows at the start of each hour only", () => {
    expect(snowActive(new Date(2026, 11, 1, 14, 3))).toBe(true);
    expect(snowActive(new Date(2026, 11, 1, 14, 30))).toBe(false);
  });
  it("has 10 presents and needs all 10", () => {
    expect(PRESENTS).toHaveLength(10);
    expect(allFound(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]))).toBe(false);
    expect(allFound(new Set(PRESENTS.map((p) => p.id)))).toBe(true);
    expect(nearPresent(PRESENTS[0]!.x, PRESENTS[0]!.z, new Set())?.id).toBe(0);
  });
  it("sleigh climbs off the ground", () => {
    let s: VehicleState = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, y: 0 };
    for (let i = 0; i < 20; i++) s = stepSleigh(s, { throttle: 1, steer: 0, climb: 1 }, 0.05);
    expect(s.y).toBeGreaterThan(5);
  });
});
