import { useCallback, useEffect, useState } from "react";
import { resolveSiteTheme, applySiteTheme, type SiteTheme } from "./themes";
import type { BgKind } from "./backgrounds";

export type Layout = "" | "lucid" | "ps5" | "glass";

/** Startup intro shown once per page load. "none" skips it. */
export type IntroStyle = "one" | "chrome" | "none";

/** Fonts offered for the glass layout clock. Each is loaded by styles/index.css. */
export const CLOCK_FONTS = ["Sora", "Orbitron", "Bebas Neue", "Playfair Display", "JetBrains Mono", "Pacifico", "Press Start 2P", "Space Grotesk"] as const;

export interface Prefs {
  theme: SiteTheme;
  layout: Layout; // "" means the user has not picked yet, so the layout chooser shows
  bg: BgKind;
  customBg: string;
  showStars: boolean;
  stars: number; // 0-100, opacity of the starfield image
  twinkle: boolean;
  starCount: number;
  shooting: boolean;
  drift: boolean;
  blur: number; // px
  dim: number; // 0-100
  clock24: boolean;
  shimejis: boolean; // walking pets along the tab bar (LUC1D layout)
  appsOnDesktop: boolean; // LUC1D layout: Discard, Stem and TikiTaki live on the desktop grid

  clockFont: string; // glass layout clock typeface, one of CLOCK_FONTS
  clockColor: string; // glass layout clock tint, a CSS colour
  intro: IntroStyle;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "classic",
  layout: "",
  bg: "starfield",
  customBg: "",
  showStars: true,
  stars: 70,
  twinkle: true,
  starCount: 120,
  shooting: true,
  drift: true,
  blur: 0,
  dim: 0,
  clock24: false,
  shimejis: true,
  appsOnDesktop: true,
  clockFont: "Sora",
  clockColor: "#5aa9f0",
  intro: "one",
};

export const PREFS_KEY = "luc1d-settings";

const INTROS: IntroStyle[] = ["one", "chrome", "none"];

function load(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return {
      ...DEFAULT_PREFS,
      ...saved,
      theme: resolveSiteTheme(saved.theme),
      intro: INTROS.includes(saved.intro) ? saved.intro : DEFAULT_PREFS.intro,
      clockColor: typeof saved.clockColor === "string" && CSS.supports("color", saved.clockColor) ? saved.clockColor : DEFAULT_PREFS.clockColor,
      clockFont: typeof saved.clockFont === "string" ? saved.clockFont : DEFAULT_PREFS.clockFont,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Preferences persisted per browser in localStorage. Changes are written and applied immediately. */
export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applySiteTheme(prefs.theme);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage full or disabled: keep running with in-memory prefs */
    }
  }, [prefs, ready]);

  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), []);

  return { prefs, ready, update, reset };
}
