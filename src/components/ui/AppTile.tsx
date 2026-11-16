import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Per-app tint tokens, defined in styles/tokens.css. Keys are app ids from src/apps/registry.ts. */
export const APP_TINTS: Record<string, string> = {
  stem: "var(--app-stem)",
  lounge: "var(--app-club)",
  advertise: "var(--app-donate)",
  game: "var(--app-stem)",
  downloads: "var(--app-downloads)",
  discard: "var(--app-discard)",
  tikitaki: "var(--app-tikitaki)",
  larpflex: "var(--app-larp)",
  clubbird: "var(--app-club)",
  pass: "var(--app-pass)",
  grime: "var(--app-longform)",
  tube: "var(--app-longform)",
  video: "var(--app-video)",
  music: "var(--app-music)",
  donate: "var(--app-donate)",
  settings: "var(--app-settings)",
  turkey: "var(--app-turkey)",
  lublox: "var(--app-lublox)",
  "lublox-studio": "var(--app-lublox)",
};

/** The CSS colour for an app's tile. Unknown ids fall back to the Stem tint. */
export function appTint(appId: string): string {
  return APP_TINTS[appId] ?? "var(--app-stem)";
}

const SIZES = {
  sm: "size-8 rounded-[10px] text-base",
  md: "size-10 rounded-[14px] text-xl",
  lg: "size-14 rounded-[18px] text-3xl",
} as const;

/**
 * A rounded gradient tile for an app icon. Pass `appId` to take the app's tint, or `tint` for any CSS colour.
 * Decorative: the surrounding button or row carries the name.
 */
export function AppTile({
  appId,
  tint,
  size = "md",
  children,
  className,
}: {
  appId?: string;
  tint?: string;
  size?: keyof typeof SIZES;
  children: ReactNode;
  className?: string;
}) {
  const style = { "--tile": tint ?? appTint(appId ?? "") } as CSSProperties;
  return (
    <span aria-hidden className={cn("app-tile grid shrink-0 place-items-center leading-none [&_svg]:size-[55%] [&_svg]:shrink-0", SIZES[size], className)} style={style}>
      {children}
    </span>
  );
}
