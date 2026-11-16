import { describe, expect, it } from "vitest";
import { XMAS_RELEASE, xmasReleased } from "./xmasAccess";
import { isXmasRing, XMAS_RING_IDS } from "./XmasRing";
import { PASS_REWARDS, PASS_XMAS_FALLBACK, passRewardFor } from "../pass/pass-rewards";

describe("Christmas release", () => {
  it("opens at the database release instant (migration 0071: 2026-11-15 10:00 UTC)", () => {
    expect(XMAS_RELEASE).toBe(Date.parse("2026-11-15T10:00:00Z"));
  });
  it("is closed one millisecond before and open at the instant", () => {
    expect(xmasReleased(XMAS_RELEASE - 1)).toBe(false);
    expect(xmasReleased(XMAS_RELEASE)).toBe(true);
  });
});

describe("Christmas rings", () => {
  it("recognises only the two snowy rings", () => {
    expect(XMAS_RING_IDS).toEqual(["ring-snowfall", "ring-candycane"]);
    expect(isXmasRing("ring-snowfall")).toBe(true);
    expect(isXmasRing("ring-candycane")).toBe(true);
    expect(isXmasRing("ring-frost")).toBe(false);
    expect(isXmasRing(undefined)).toBe(false);
  });
});

describe("Battle Pass Christmas levels", () => {
  it("level 4 is Snowfall and level 7 is Candy Cane (migration 0058)", () => {
    expect(PASS_REWARDS.find((r) => r.level === 4)?.ring).toBe("ring-snowfall");
    expect(PASS_REWARDS.find((r) => r.level === 7)?.ring).toBe("ring-candycane");
  });
  it("shows money instead of the ring without Christmas access (migration 0059)", () => {
    const four = PASS_REWARDS.find((r) => r.level === 4)!;
    const seven = PASS_REWARDS.find((r) => r.level === 7)!;
    expect(passRewardFor(four, false)).toMatchObject({ cents: 1500, label: "$15.00" });
    expect(passRewardFor(seven, false)).toMatchObject({ cents: 2500, label: "$25.00" });
    expect(PASS_XMAS_FALLBACK["ring-snowfall"]?.cents).toBe(1500);
  });
  it("shows the ring with Christmas access and leaves other levels alone", () => {
    const four = PASS_REWARDS.find((r) => r.level === 4)!;
    expect(passRewardFor(four, true)).toBe(four);
    const one = PASS_REWARDS.find((r) => r.level === 1)!;
    expect(passRewardFor(one, false)).toBe(one);
  });
});
