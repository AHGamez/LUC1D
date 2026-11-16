import { VIDEO_FALLBACK_GRADIENT, useVideoBackgroundMedia } from "./videoBackgrounds";

export interface VideoWallpaperProps {
  /** Saved wallpaper id, e.g. "minecraft-snow". */
  id: unknown;
  /** From useDeviceMode().reduceEffects. On phones the poster is shown instead of playing video. */
  reduceEffects?: boolean;
  /** Label for the video element. Defaults to the wallpaper name. */
  label?: string;
  className?: string;
}

/**
 * Fills its parent with a looping muted video wallpaper. Falls back to the poster, then to a
 * gradient, when media is missing or effects are reduced. Decorative, so it is hidden from assistive tech.
 */
export default function VideoWallpaper({ id, reduceEffects = false, label, className = "" }: VideoWallpaperProps) {
  const { background, video, poster } = useVideoBackgroundMedia(id);
  if (!background) return null;

  const fill = `pointer-events-none h-full w-full object-cover ${className}`;
  if (reduceEffects || !video) {
    return poster ? (
      <img src={poster} alt="" aria-hidden="true" decoding="async" className={fill} />
    ) : (
      <div aria-hidden="true" className={`h-full w-full ${className}`} style={{ background: VIDEO_FALLBACK_GRADIENT }} />
    );
  }

  return (
    <video
      key={background.id}
      aria-label={label ?? background.name}
      src={video}
      poster={poster ?? undefined}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      className={fill}
    />
  );
}
