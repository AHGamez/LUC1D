import { describe, expect, it } from "vitest";
import { avatarExtension, chatTag, joinedLabel } from "./discard-profile";
import { GIF_UNLOCK_CENTS, isGifFile, shopTag } from "./club-items";

describe("Discard verified chat tags", () => {
  it("shows the special Owner tag for a verified owner assignment", () => {
    expect(chatTag("owner")).toBe("Owner");
  });
  it("shows Mod Management for the database-granted modmgmt tag", () => {
    expect(chatTag("modmgmt")).toBe("Mod Management");
  });
  it("does not award Owner based on a requested display name", () => {
    expect(chatTag("st4x/m1stic")).toBe("Member");
    expect(chatTag("s2293409")).toBe("Member");
    expect(chatTag()).toBe("Member");
  });
});

describe("Discard banner and picture uploads", () => {
  it("accepts only the picture types the storage policy allows", () => {
    expect(avatarExtension("image/png")).toBe("png");
    expect(avatarExtension("image/jpeg")).toBe("jpg");
    expect(avatarExtension("image/webp")).toBe("webp");
    expect(avatarExtension("image/gif")).toBe("gif");
    expect(avatarExtension("image/svg+xml")).toBeUndefined();
    expect(avatarExtension("application/pdf")).toBeUndefined();
  });
  it("detects GIF files by type or extension", () => {
    expect(isGifFile({ type: "image/gif", name: "a.bin" })).toBe(true);
    expect(isGifFile({ type: "", name: "clip.GIF" })).toBe(true);
    expect(isGifFile({ type: "image/png", name: "a.png" })).toBe(false);
    expect(GIF_UNLOCK_CENTS).toBe(5000);
  });
});

describe("Discard join date", () => {
  it("formats the database account date", () => {
    expect(joinedLabel("2024-03-05T12:00:00Z")).toMatch(/^Joined /);
  });
  it("omits the line when the date is missing or unreadable", () => {
    expect(joinedLabel(undefined)).toBeNull();
    expect(joinedLabel(null)).toBeNull();
    expect(joinedLabel("not a date")).toBeNull();
  });
});

describe("Club tags that only the database can grant", () => {
  it("displays the tuffboi and XMAS-26 tags when they are worn", () => {
    expect(shopTag("tag-tuffboi")?.name).toBe("Tuff Boi");
    expect(shopTag("tag-xmas26")?.name).toBe("XMAS-26");
  });
  it("does not display an unknown tag id", () => {
    expect(shopTag("tag-made-up")).toBeUndefined();
  });
});
