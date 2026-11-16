import { describe, expect, it } from "vitest";
import { slipSpeed, stepVehicle, MAP_LIMIT, type VehicleState } from "@/lib/lublox-vehicle";
const run = (handbrake: boolean) => {
  let s: VehicleState = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0 };
  for (let i = 0; i < 60; i++) s = stepVehicle(s, { throttle: 1, steer: 0, handbrake: false }, "car", 1 / 60);
  for (let i = 0; i < 40; i++) s = stepVehicle(s, { throttle: 1, steer: 1, handbrake }, "car", 1 / 60);
  return slipSpeed(s);
};
describe("lublox vehicles", () => {
  it("car slides sideways much more with the handbrake (drift)", () => {
    expect(run(true)).toBeGreaterThan(run(false) * 2);
  });
  it("vehicles stay inside the map", () => {
    let s: VehicleState = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0 };
    for (let i = 0; i < 2000; i++) s = stepVehicle(s, { throttle: 1, steer: 0, handbrake: false }, "car", 1 / 60);
    expect(s.z).toBeLessThanOrEqual(MAP_LIMIT);
  });
});
