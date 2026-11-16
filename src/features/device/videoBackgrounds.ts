import { useEffect, useState } from "react";
import northern from "@/assets/northern-minecraft.mp4.asset.json";
import snow from "@/assets/minecraft-falling-snow.mp4.asset.json";
import snowPoster from "@/assets/minecraft-falling-snow.jpg.asset.json";
import campfire from "@/assets/minecraft-snowy-campfire.mp4.asset.json";
import campfirePoster from "@/assets/minecraft-snowy-campfire.jpg.asset.json";
import fireplace from "@/assets/fireplace-in-minecraft.mp4.asset.json";
import fireplacePoster from "@/assets/fireplace-in-minecraft.jpg.asset.json";
import farm from "@/assets/minecraft-sunset-farm.mp4.asset.json";
import farmPoster from "@/assets/minecraft-sunset-farm.jpg.asset.json";
import center from "@/assets/fancy-center-minecraft.mp4.asset.json";
import centerPoster from "@/assets/fancy-center-minecraft.jpg.asset.json";
import cabin from "@/assets/minecraft-overgrown-cabin.mp4.asset.json";
import cabinPoster from "@/assets/minecraft-overgrown-cabin.jpg.asset.json";
import nature from "@/assets/minecraft-nature.mp4.asset.json";
import naturePoster from "@/assets/minecraft-nature.jpg.asset.json";

/**
 * Video wallpapers. The src/assets/*.asset.json files are manifests only: the actual .mp4 and .jpg
 * files are not in the repository, so their URLs may not resolve. Always go through
 * useVideoBackgroundMedia, which falls back to a gradient (or the poster) when media is missing.
 *
 * The first id ("minecraft") is kept from the original app so saved preferences still match.
 */
export interface VideoBackground {
  id: string;
  name: string;
  url: string;
  poster?: string;
}

export const VIDEO_BACKGROUNDS: readonly VideoBackground[] = [
  { id: "minecraft", name: "Northern Minecraft", url: northern.url },
  { id: "minecraft-snow", name: "Minecraft Falling Snow", url: snow.url, poster: snowPoster.url },
  { id: "minecraft-campfire", name: "Minecraft Snowy Campfire", url: campfire.url, poster: campfirePoster.url },
  { id: "minecraft-fireplace", name: "Minecraft Fireplace", url: fireplace.url, poster: fireplacePoster.url },
  { id: "minecraft-farm", name: "Minecraft Sunset Farm", url: farm.url, poster: farmPoster.url },
  { id: "minecraft-center", name: "Fancy Center Minecraft", url: center.url, poster: centerPoster.url },
  { id: "minecraft-cabin", name: "Minecraft Overgrown Cabin", url: cabin.url, poster: cabinPoster.url },
  { id: "minecraft-nature", name: "Minecraft Nature", url: nature.url, poster: naturePoster.url },
];

/** Shown when a video or poster cannot be loaded. Dark green so it matches the Minecraft set. */
export const VIDEO_FALLBACK_GRADIENT = "linear-gradient(160deg, #1f2d1c 0%, #0c1220 100%)";

export function findVideoBackground(id: unknown): VideoBackground | undefined {
  return typeof id === "string" ? VIDEO_BACKGROUNDS.find((b) => b.id === id) : undefined;
}

const probeCache = new Map<string, Promise<boolean>>();

async function probeOnce(url: string, kind: "video" | "image"): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return false;
    // A missing file on a single-page host often returns the app's HTML with status 200. Check the type.
    const type = res.headers.get("content-type") ?? "";
    return type.startsWith(kind === "video" ? "video/" : "image/");
  } catch {
    return false;
  }
}

/** True when the media URL exists and has the right type. Results are cached for the page load. */
export function probeMedia(url: string, kind: "video" | "image"): Promise<boolean> {
  const key = `${kind}:${url}`;
  let result = probeCache.get(key);
  if (!result) {
    result = probeOnce(url, kind);
    probeCache.set(key, result);
  }
  return result;
}

export interface VideoBackgroundMedia {
  /** The wallpaper definition for the id, or null when the id is unknown or none is chosen. */
  background: VideoBackground | null;
  /** Video URL when it loads, otherwise null. */
  video: string | null;
  /** Poster URL when it loads, otherwise null. */
  poster: string | null;
  /** True while the media check is still running. */
  checking: boolean;
}

/**
 * Resolves a wallpaper id to a playable video and poster. Missing media resolves to null so the
 * caller can render VIDEO_FALLBACK_GRADIENT instead.
 */
export function useVideoBackgroundMedia(id: unknown): VideoBackgroundMedia {
  const background = findVideoBackground(id) ?? null;
  const bgId = background?.id ?? null;
  const [resolved, setResolved] = useState<{ id: string; video: string | null; poster: string | null } | null>(null);

  useEffect(() => {
    const bg = findVideoBackground(bgId);
    if (!bg) return;
    let alive = true;
    Promise.all([probeMedia(bg.url, "video"), bg.poster ? probeMedia(bg.poster, "image") : Promise.resolve(false)]).then(
      ([hasVideo, hasPoster]) => {
        if (!alive) return;
        setResolved({ id: bg.id, video: hasVideo ? bg.url : null, poster: hasPoster && bg.poster ? bg.poster : null });
      },
    );
    return () => {
      alive = false;
    };
  }, [bgId]);

  const current = resolved?.id === bgId ? resolved : null;
  return {
    background,
    video: current?.video ?? null,
    poster: current?.poster ?? null,
    checking: background !== null && current === null,
  };
}
