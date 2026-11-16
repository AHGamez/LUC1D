// Whole-site colour themes. The `id` must match a [data-site-theme="..."] block in styles/themes.css.
// `bg` is the default wallpaper the theme pairs with (see lib/backgrounds.ts).

export const SITE_THEMES = [
  { id: "classic", name: "Classic", bg: "starfield" },
  { id: "midnight", name: "Midnight", bg: "void" },
  { id: "ocean", name: "Ocean", bg: "ocean" },
  { id: "forest", name: "Forest", bg: "aurora" },
  { id: "rose", name: "Rose", bg: "sunset" },
  { id: "cyberpunk", name: "Cyberpunk", bg: "void" },
  { id: "lavender", name: "Lavender", bg: "starfield" },
  { id: "ember", name: "Ember", bg: "sunset" },
  { id: "mono", name: "Mono", bg: "void" },
  { id: "mint", name: "Mint", bg: "aurora" },
  { id: "light", name: "Light", bg: "ocean" },
] as const;

export type SiteTheme = (typeof SITE_THEMES)[number]["id"];

export function resolveSiteTheme(value: unknown): SiteTheme {
  return SITE_THEMES.find((theme) => theme.id === value)?.id ?? "classic";
}

/** Writes the theme to <html data-site-theme>, which the CSS variables key off. */
export function applySiteTheme(theme: SiteTheme) {
  document.documentElement.dataset.siteTheme = theme;
}
