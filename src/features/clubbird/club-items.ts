// Club Bird item catalogue. Prices mirror public.club_price() in the database, which is the
// source of truth: the client only shows them, and club_buy() charges the server-side price.
export type ClubKind = "ring" | "color" | "hat" | "house" | "tag" | "pet";
export type ClubItem = {
  id: string;
  kind: ClubKind;
  name: string;
  cents: number;
  swatch?: string;
  /** Free gift tag: never sold, only shown once owned. */
  gift?: boolean;
  /** Limited Christmas item (migration 0055). Hidden from the shop unless the viewer has Christmas access. */
  limited?: boolean;
};

export const CLUB_ITEMS: ClubItem[] = [
  { id: "ring-nebula", kind: "ring", name: "Nebula ring", cents: 500 },
  { id: "ring-inferno", kind: "ring", name: "Inferno ring", cents: 1000 },
  { id: "ring-rainbow", kind: "ring", name: "Rainbow ring", cents: 2000 },
  { id: "ring-royal", kind: "ring", name: "Royal ring", cents: 5000 },
  { id: "color-red", kind: "color", name: "Cardinal red", cents: 100, swatch: "#e5484d" },
  { id: "color-blue", kind: "color", name: "Blue jay", cents: 100, swatch: "#3e8ef7" },
  { id: "color-pink", kind: "color", name: "Flamingo pink", cents: 150, swatch: "#f381c4" },
  { id: "color-purple", kind: "color", name: "Violet finch", cents: 150, swatch: "#9b6cf2" },
  { id: "color-gold", kind: "color", name: "Golden", cents: 1000, swatch: "#f5c542" },
  { id: "hat-cap", kind: "hat", name: "Cap", cents: 200 },
  { id: "hat-shades", kind: "hat", name: "Shades", cents: 300 },
  { id: "hat-tophat", kind: "hat", name: "Top hat", cents: 500 },
  { id: "hat-halo", kind: "hat", name: "Halo", cents: 800 },
  { id: "hat-crown", kind: "hat", name: "Crown", cents: 2500 },
  { id: "house-cottage", kind: "house", name: "Cottage", cents: 2500 },
  { id: "house-villa", kind: "house", name: "Villa", cents: 7500 },
  { id: "house-mansion", kind: "house", name: "Mansion", cents: 20000 },
  { id: "tag-chirpy", kind: "tag", name: "Chirpy", cents: 300, swatch: "#f2a93b" },
  { id: "tag-gamer", kind: "tag", name: "Gamer", cents: 500, swatch: "#22c55e" },
  { id: "tag-goat", kind: "tag", name: "GOAT", cents: 1000, swatch: "#3e8ef7" },
  { id: "tag-rich", kind: "tag", name: "Rich", cents: 2500, swatch: "#f5c542" },
  { id: "tag-legend", kind: "tag", name: "Legend", cents: 5000, swatch: "#e5484d" },
  { id: "tag-whale", kind: "tag", name: "Whale", cents: 10000, swatch: "#9b6cf2" },
  { id: "tag-firstacct", kind: "tag", name: "1st account ever", cents: 0, swatch: "#a855f7", gift: true },
  { id: "tag-tuffboi", kind: "tag", name: "Tuff Boi", cents: 0, swatch: "#f97316", gift: true },
  { id: "tag-donater", kind: "tag", name: "DONATER", cents: 0, swatch: "#f472b6", gift: true },
  { id: "tag-xmas26", kind: "tag", name: "XMAS-26", cents: 0, swatch: "#ef4444", gift: true },
  { id: "pet-stickman", kind: "pet", name: "Stick man", cents: 1500 },
  { id: "pet-turkey", kind: "pet", name: "Turkey", cents: 2000 },
  { id: "pet-pompom", kind: "pet", name: "Pom-pom kid", cents: 2500 },
  { id: "pet-flaps", kind: "pet", name: "Ear-flap kid", cents: 2500 },
  { id: "pet-chunk", kind: "pet", name: "Big-coat kid", cents: 2500 },
  { id: "pet-parka", kind: "pet", name: "Parka kid", cents: 2500 },
  { id: "pet-miner", kind: "pet", name: "Block miner", cents: 3000 },
  { id: "pet-santa", kind: "pet", name: "Santa 🎅", cents: 2500, limited: true },
];

/** Limited Christmas wallpaper; mirrors club_price('bg-xmas') (migration 0055). Sold in the desktop backgrounds, not in this shop. */
export const XMAS_BG_CENTS = 2026;

/** Items the shop hides from players without Christmas access (the database refuses them too). */
export const isHiddenWithoutXmas = (item: ClubItem) => !!item.limited;

export const DEFAULT_BIRD_COLOR = "#f2a93b";
export const birdColor = (id?: string | null) => CLUB_ITEMS.find((i) => i.id === id)?.swatch ?? DEFAULT_BIRD_COLOR;
export const money = (cents: number) => `$${(Math.max(0, cents) / 100).toFixed(2)}`;
export const bestHouse = (owned: Set<string>) =>
  ["house-mansion", "house-villa", "house-cottage"].find((h) => owned.has(h)) ?? null;

export type BoardRow = {
  userId: string;
  cents: number;
  messages: number;
  name: string;
  color: string;
  hat: string;
};

// Richest first; ties broken by messages sent, then name so the order never jitters.
export const rankByMoney = (rows: BoardRow[]): BoardRow[] =>
  [...rows].sort(
    (a, b) =>
      b.cents - a.cents ||
      b.messages - a.messages ||
      a.name.localeCompare(b.name) ||
      a.userId.localeCompare(b.userId),
  );
