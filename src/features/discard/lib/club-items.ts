// Mirrors the Club Bird price list that public.club_price() enforces on the server (the source of truth).
// Only the entries Discard displays are copied here: paid rings (profile decorations) and chat tags.
// Gift tags (cents 0) are owned only through database functions (tuffboi_claim, the Xmas gift). Clients cannot
// insert club_owned rows, and club_equip refuses any tag the account does not own.

export type ClubItem = { id: string; kind: "ring" | "tag"; name: string; cents: number; swatch?: string; gift?: boolean };

export const CLUB_ITEMS: ClubItem[] = [
  { id: "ring-nebula", kind: "ring", name: "Nebula ring", cents: 500 },
  { id: "ring-inferno", kind: "ring", name: "Inferno ring", cents: 1000 },
  { id: "ring-rainbow", kind: "ring", name: "Rainbow ring", cents: 2000 },
  { id: "ring-royal", kind: "ring", name: "Royal ring", cents: 5000 },
  { id: "tag-chirpy", kind: "tag", name: "Chirpy", cents: 300, swatch: "#f2a93b" },
  { id: "tag-gamer", kind: "tag", name: "Gamer", cents: 500, swatch: "#22c55e" },
  { id: "tag-goat", kind: "tag", name: "GOAT", cents: 1000, swatch: "#3e8ef7" },
  { id: "tag-rich", kind: "tag", name: "Rich", cents: 2500, swatch: "#f5c542" },
  { id: "tag-legend", kind: "tag", name: "Legend", cents: 5000, swatch: "#e5484d" },
  { id: "tag-whale", kind: "tag", name: "Whale", cents: 10000, swatch: "#9b6cf2" },
  // Verified gift tags. tag-tuffboi is granted by tuffboi_claim() (one winner per account, server-side window).
  { id: "tag-tuffboi", kind: "tag", name: "Tuff Boi", cents: 0, swatch: "#f97316", gift: true },
  { id: "tag-xmas26", kind: "tag", name: "XMAS-26", cents: 0, swatch: "#ef4444", gift: true },
];

export const shopTag = (id?: string | null) => CLUB_ITEMS.find((i) => i.kind === "tag" && i.id === id);
export const itemPrice = (id: string) => CLUB_ITEMS.find((i) => i.id === id)?.cents ?? 0;
export const money = (cents: number) => `$${(Math.max(0, cents) / 100).toFixed(2)}`;

/** Moderator money gifts. Mirrors public.club_grant(), which enforces the limits. */
export const GIFT_CENTS_OPTIONS = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000] as const;

/** GIF profile pictures and GIF banners are each a paid unlock; mirrors club_price('gif-pfp') and club_price('gif-banner'). */
export const GIF_UNLOCK_CENTS = 5000;
export const isGifFile = (f: { type: string; name: string }) => f.type === "image/gif" || /\.gif$/i.test(f.name);
