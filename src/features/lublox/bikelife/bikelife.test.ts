import { describe, expect, it } from "vitest";
import { MAX_WHEELIE, newBike, payoutRequest, PAYOUT_MAX, stepBike, trickCents } from "./bikelife";

describe("bikelife", () => {
  it("allows a wheelie up to 100 degrees", () => {
    const s = { ...newBike(), speed: 10, pitch: (99 * Math.PI) / 180 };
    expect(stepBike(s, { throttle: 0, steer: 0, wheelie: false }, "surron", 0.01).looped).toBe(false);
    expect(MAX_WHEELIE).toBeCloseTo((100 * Math.PI) / 180);
  });
  it("loops out past 100 degrees", () => {
    const s = { ...newBike(), speed: 10, pitch: MAX_WHEELIE - 0.001 };
    expect(stepBike(s, { throttle: 1, steer: 0, wheelie: true }, "surron", 0.05).looped).toBe(true);
  });
  it("no hander pays more than a plain wheelie", () => {
    const s = { ...newBike(), pitch: 1 };
    expect(trickCents(s, "nohand", 0.05)).toBeGreaterThan(trickCents(s, "none", 0.05));
  });
  it("caps a single cash-out at the payout maximum and never goes negative", () => {
    expect(payoutRequest(10_000)).toBe(PAYOUT_MAX);
    expect(payoutRequest(150.7)).toBe(150);
    expect(payoutRequest(0)).toBe(0);
  });
});
