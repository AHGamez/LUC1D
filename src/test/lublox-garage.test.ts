import { describe, expect, it } from "vitest";
import { GARAGE_CARS, GARAGE_PAD, inGarage, onPad, PLAINS_PAD } from "@/lib/lublox-garage";
describe("garage", () => {
  it("red corner pad triggers only when standing on it", () => {
    expect(onPad({ x: 108, z: 108 }, PLAINS_PAD)).toBe(true);
    expect(onPad({ x: 100, z: 100 }, PLAINS_PAD)).toBe(false);
  });
  it("garage return pad is inside the garage", () => expect(inGarage(GARAGE_PAD)).toBe(true));
  it("prices", () => expect(GARAGE_CARS.map((c) => c.price)).toEqual([1500, 3000, 10000]));
});
