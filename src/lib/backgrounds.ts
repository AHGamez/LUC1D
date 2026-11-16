// Wallpaper kinds. "starfield" uses the bundled image (public/starfield.jpg) on top of its gradient;
// "custom" shows a user-supplied image URL stored in prefs.customBg; any video wallpaper id comes from
// the shared catalogue owned by the Device feature (src/features/device/videoBackgrounds.ts).

import { VIDEO_BACKGROUNDS } from "@/features/device/videoBackgrounds";

export {
  VIDEO_BACKGROUNDS,
  VIDEO_FALLBACK_GRADIENT,
  findVideoBackground,
  type VideoBackground,
} from "@/features/device/videoBackgrounds";

export type StaticBgKind = "starfield" | "aurora" | "sunset" | "ocean" | "void" | "custom";

/** A static kind, or a video wallpaper id from VIDEO_BACKGROUNDS. */
export type BgKind = StaticBgKind | string;

export const BG_OPTIONS: { id: BgKind; name: string }[] = [
  { id: "starfield", name: "Starfield" },
  { id: "aurora", name: "Aurora" },
  { id: "sunset", name: "Sunset" },
  { id: "ocean", name: "Ocean" },
  { id: "void", name: "Void" },
  ...VIDEO_BACKGROUNDS.map((v) => ({ id: v.id, name: v.name })),
  { id: "custom", name: "Your own" },
];

export const GRADIENTS: Record<"starfield" | "aurora" | "sunset" | "ocean" | "void", string> = {
  starfield:
    "radial-gradient(ellipse at 72% 12%, oklch(0.5 0.14 300 / .32), transparent 55%), radial-gradient(ellipse at 12% 88%, oklch(0.45 0.11 230 / .28), transparent 55%), radial-gradient(ellipse at 50% 55%, oklch(0.35 0.08 285 / .18), transparent 70%)",
  aurora:
    "radial-gradient(ellipse at 20% 20%, oklch(0.5 0.16 165 / .85), transparent 60%), radial-gradient(ellipse at 80% 30%, oklch(0.42 0.19 300 / .75), transparent 60%), radial-gradient(ellipse at 55% 88%, oklch(0.45 0.15 205 / .5), transparent 60%), oklch(0.12 0.04 275)",
  sunset:
    "radial-gradient(ellipse at 78% 12%, oklch(0.42 0.15 320 / .5), transparent 55%), radial-gradient(ellipse at 22% 72%, oklch(0.55 0.17 30 / .45), transparent 60%), linear-gradient(180deg, oklch(0.22 0.09 300), oklch(0.45 0.17 20) 60%, oklch(0.7 0.16 60))",
  ocean:
    "radial-gradient(ellipse at 18% 12%, oklch(0.42 0.12 210 / .6), transparent 60%), radial-gradient(ellipse at 82% 82%, oklch(0.48 0.13 175 / .45), transparent 60%), linear-gradient(180deg, oklch(0.14 0.05 255), oklch(0.32 0.1 220) 70%, oklch(0.45 0.1 200))",
  void:
    "radial-gradient(ellipse at 15% 8%, oklch(0.38 0.13 300 / .4), transparent 55%), radial-gradient(ellipse at 88% 88%, oklch(0.32 0.15 290 / .35), transparent 55%), radial-gradient(ellipse at 50% 50%, oklch(0.22 0.09 310 / .28), transparent 72%), oklch(0.07 0.02 300)",
};
