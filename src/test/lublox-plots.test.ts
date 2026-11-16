import { describe, expect, it } from "vitest";
import { nearestPlot, PLOTS } from "@/lib/lublox-plots";
describe("plots", () => {
  it("there are exactly 10 distinct plots", () => {
    expect(PLOTS).toHaveLength(10);
    expect(new Set(PLOTS.map((p) => `${p.x},${p.z}`)).size).toBe(10);
  });
  it("plots sit at the map edge", () => PLOTS.forEach((p) => expect(Math.abs(p.z)).toBeGreaterThan(120)));
  it("finds the plot you stand on", () => {
    expect(nearestPlot({ x: -80, z: -128 })?.plot).toBe(1);
    expect(nearestPlot({ x: 0, z: 0 })).toBeNull();
  });
});
