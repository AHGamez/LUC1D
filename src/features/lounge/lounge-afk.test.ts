import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { afkRewardCents } from "./lounge-afk";

describe("Lounge AFK rewards", () => {
  it("awards exactly 10 DC per completed hour", () => {
    expect(afkRewardCents(3599)).toBe(0);
    expect(afkRewardCents(3600)).toBe(1000);
    expect(afkRewardCents(7200)).toBe(2000);
    const sql = readFileSync("drizzle/migrations/0075_lounge_afk_rewards.sql", "utf8");
    expect(sql).toContain("greatest(0, _seconds) / 3600 * 1000");
  });
});