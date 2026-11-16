import { afterEach, describe, expect, it, vi } from "vitest";
import { TAB_CLOAKS, getTabCloakId } from "./tabCloaks";
import { VIDEO_BACKGROUNDS, findVideoBackground, probeMedia } from "./videoBackgrounds";

describe("tab cloaks", () => {
  it("is off by default when nothing is stored", () => {
    expect(getTabCloakId()).toBe("");
  });

  it("has unique ids", () => {
    const ids = TAB_CLOAKS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("video backgrounds", () => {
  it("keeps the original Northern Minecraft id", () => {
    expect(VIDEO_BACKGROUNDS[0]?.id).toBe("minecraft");
  });

  it("has unique ids and non-empty urls", () => {
    const ids = VIDEO_BACKGROUNDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of VIDEO_BACKGROUNDS) expect(b.url.length).toBeGreaterThan(0);
  });

  it("returns undefined for unknown or non-string ids", () => {
    expect(findVideoBackground("nope")).toBeUndefined();
    expect(findVideoBackground(42)).toBeUndefined();
  });
});

describe("probeMedia", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("treats an HTML fallback page as missing media", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { "content-type": "text/html" } })));
    expect(await probeMedia("/__test-html.mp4", "video")).toBe(false);
  });

  it("accepts a real video response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { "content-type": "video/mp4" } })));
    expect(await probeMedia("/__test-real.mp4", "video")).toBe(true);
  });

  it("treats a network error as missing media", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await probeMedia("/__test-offline.jpg", "image")).toBe(false);
  });
});
