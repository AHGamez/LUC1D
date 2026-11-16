import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Preset banners. Ids match the discard_profiles.banner CHECK constraint (migration 0064). */
export const BANNERS = [
  { id: "blurple", name: "Blurple" },
  { id: "sunset", name: "Sunset" },
  { id: "aurora", name: "Aurora" },
  { id: "ocean", name: "Ocean" },
  { id: "rose", name: "Rose" },
  { id: "midnight", name: "Midnight" },
  { id: "forest", name: "Forest" },
  { id: "gold", name: "Gold" },
  { id: "candy", name: "Candy" },
  { id: "xmas", name: "Xmas" },
] as const;

/** Name effects. Ids match the discard_profiles.name_effect CHECK constraint (migration 0064). */
export const NAME_EFFECTS = [
  { id: "none", name: "None", glyph: "" },
  { id: "snow", name: "Snowflakes", glyph: "❄" },
  { id: "stars", name: "Stars", glyph: "★" },
  { id: "hearts", name: "Hearts", glyph: "♥" },
  { id: "sparkles", name: "Sparkles", glyph: "✦" },
] as const;

/**
 * Little glyphs that drift around a display name. Pure CSS, so it stops under prefers-reduced-motion
 * (see discard.css). The glyphs are aria-hidden; the name text is what screen readers read.
 */
export function NameEffect({ effect, children }: { effect?: string | null | undefined; children: ReactNode }) {
  const glyph = NAME_EFFECTS.find((e) => e.id === effect)?.glyph;
  if (!glyph) return <>{children}</>;
  return (
    <span className={`d-fx d-fx--${effect}`}>
      {children}
      <span aria-hidden="true" className="d-fx-layer">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} style={{ left: `${8 + i * 16}%`, animationDelay: `${i * -0.45}s` }}>
            {glyph}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Banner strip for a profile. A custom banner (signed URL) replaces the preset gradient.
 * Pass `keepMotion` in the picker so presets always animate there; a user's "hide profile effects" setting
 * (html[data-hide-profile-fx]) flattens the others.
 */
export function ProfileBanner({ banner, imageUrl, className = "h-16", keepMotion = false }: { banner?: string | null | undefined; imageUrl?: string | null | undefined; className?: string; keepMotion?: boolean }) {
  const preset = BANNERS.some((b) => b.id === banner) ? banner : "blurple";
  return (
    <div className={cn("d-banner", imageUrl ? "d-banner--custom" : `d-banner--${preset}`, keepMotion && "d-keep", className)}>
      {imageUrl && <img src={imageUrl} alt="Custom profile banner" className="size-full object-cover" />}
    </div>
  );
}
