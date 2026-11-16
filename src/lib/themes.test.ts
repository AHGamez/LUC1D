import { describe, expect, it } from "vitest";
import { SITE_THEMES, resolveSiteTheme } from "./themes";

describe("resolveSiteTheme", () => {
  it("accepts every known theme id", () => {
    for (const t of SITE_THEMES) expect(resolveSiteTheme(t.id)).toBe(t.id);
  });

  it("falls back to classic for unknown or non-string values", () => {
    expect(resolveSiteTheme("neon-unknown")).toBe("classic");
    expect(resolveSiteTheme(undefined)).toBe("classic");
    expect(resolveSiteTheme(42)).toBe("classic");
  });
});
