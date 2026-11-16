import type { CSSProperties } from "react";
import type { Prefs } from "../lib/prefs";
import { GRADIENTS, findVideoBackground } from "../lib/backgrounds";
import VideoWallpaper from "../features/device/VideoWallpaper";
import { useDeviceMode } from "../features/device/useDeviceMode";
import { Twinkles } from "./Twinkles";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Full-screen background behind every layout. Order matters: the picture, video or gradient,
 * then stars (not over video), then an optional dim overlay that sits above them.
 */
export function Wallpaper({ prefs }: { prefs: Prefs }) {
  const { reduceEffects } = useDeviceMode(); // phones skip blur, drift and twinkle to save battery
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const video = findVideoBackground(prefs.bg) !== undefined;
  const drift = prefs.drift && !reduceEffects;
  const driftStyle: CSSProperties = { filter: prefs.blur && !reduceEffects ? `blur(${prefs.blur}px)` : undefined };

  return (
    <>
      <div className={`pointer-events-none absolute inset-0 ${drift ? "lucid-drift" : ""}`} style={driftStyle}>
        {video ? (
          <VideoWallpaper id={prefs.bg} reduceEffects={reduceEffects || reduceMotion} />
        ) : prefs.bg === "starfield" ? (
          <>
            {prefs.showStars && (
              <img
                src="/starfield.jpg"
                alt=""
                width={1920}
                height={1024}
                decoding="async"
                className="h-full w-full object-cover"
                style={{ opacity: prefs.stars / 100 }}
              />
            )}
            <div className="absolute inset-0" style={{ background: GRADIENTS.starfield }} />
          </>
        ) : prefs.bg === "custom" ? (
          prefs.customBg && <img src={prefs.customBg} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: GRADIENTS[prefs.bg as keyof typeof GRADIENTS] ?? GRADIENTS.starfield }} />
        )}
      </div>
      {!video && prefs.twinkle && !reduceEffects && <Twinkles count={prefs.starCount} shooting={prefs.shooting} />}
      {prefs.dim > 0 && <div className="pointer-events-none absolute inset-0 bg-background" style={{ opacity: prefs.dim / 100 }} />}
    </>
  );
}
