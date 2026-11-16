import { describe, expect, it } from "vitest";
import { CLUB_ITEMS, XMAS_BG_CENTS, isHiddenWithoutXmas } from "./club-items";

const byId = (id: string) => CLUB_ITEMS.find((i) => i.id === id);

describe("Christmas shop items", () => {
  it("Santa pet is limited and costs $25 (migration 0055)", () => {
    const santa = byId("pet-santa");
    expect(santa?.cents).toBe(2500);
    expect(santa && isHiddenWithoutXmas(santa)).toBe(true);
  });
  it("Christmas wallpaper price matches the database (2026 cents)", () => {
    expect(XMAS_BG_CENTS).toBe(2026);
  });
  it("gift tags are free and never sold", () => {
    const gifts = CLUB_ITEMS.filter((i) => i.gift);
    expect(gifts.map((i) => i.id)).toEqual(["tag-firstacct", "tag-tuffboi", "tag-donater", "tag-xmas26"]);
    expect(gifts.every((i) => i.cents === 0)).toBe(true);
  });
  it("ordinary items are not hidden without Christmas access", () => {
    expect(byId("hat-crown") && isHiddenWithoutXmas(byId("hat-crown")!)).toBe(false);
  });
});
