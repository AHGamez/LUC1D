import { describe, expect, it } from "vitest";
import { LOOP_ANGLE, stepWheelie } from "@/lib/lublox-vehicle";
describe("e-bike wheelie", () => {
  it("loops out and falls off when held too long", () => {
    let s = { angle: 0, looped: false };
    for (let i = 0; i < 200 && !s.looped; i++) s = stepWheelie(s.angle, true, 10, 0.02);
    expect(s.looped).toBe(true);
  });
  it("stays up without looping when released before the loop angle", () => {
    const s = stepWheelie(LOOP_ANGLE - 0.1, false, 10, 0.05);
    expect(s.looped).toBe(false);
    expect(s.angle).toBeLessThan(LOOP_ANGLE - 0.1);
  });
  it("needs speed to lift", () => {
    expect(stepWheelie(0, true, 0, 0.05).angle).toBe(0);
  });
});
