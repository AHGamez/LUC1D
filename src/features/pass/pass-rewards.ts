// Battle Pass levels. Mirrors public.club_pass_reward() and the XP rules in the database,
// which are the source of truth. The client only displays these; club_pass_claim() grants them.
export const PASS_PRICE_CENTS = 2000;
export const XP_PER_LEVEL = 100;
export const PASS_MAX_LEVEL = 10;

export type PassReward = { level: number; cents?: number; ring?: string; label: string };

export const PASS_REWARDS: PassReward[] = [
  { level: 1, cents: 500, label: "$5.00" },
  { level: 2, ring: "ring-frost", label: "Frost ring" },
  { level: 3, cents: 1000, label: "$10.00" },
  { level: 4, ring: "ring-snowfall", label: "❄️ Snowfall ring" },
  { level: 5, ring: "ring-toxic", label: "Toxic ring" },
  { level: 6, cents: 2000, label: "$20.00" },
  { level: 7, ring: "ring-candycane", label: "🍬 Candy Cane ring" },
  { level: 8, cents: 3000, label: "$30.00" },
  { level: 9, cents: 4000, label: "$40.00" },
  { level: 10, ring: "ring-legend", label: "Legend ring" },
];

/**
 * Money a Christmas ring level pays when the viewer has no Christmas access (club_pass_claim, migration 0059).
 * Shown instead of the ring until the viewer has access.
 */
export const PASS_XMAS_FALLBACK: Record<string, { cents: number; label: string }> = {
  "ring-snowfall": { cents: 1500, label: "$15.00" },
  "ring-candycane": { cents: 2500, label: "$25.00" },
};

/** The reward a level shows for this viewer: the Christmas ring when they have access, else its money fallback. */
export function passRewardFor(r: PassReward, xmas: boolean): PassReward {
  const fb = !xmas && r.ring ? PASS_XMAS_FALLBACK[r.ring] : undefined;
  return fb ? { level: r.level, cents: fb.cents, label: fb.label } : r;
}

export const passLevel = (xp: number) => Math.min(PASS_MAX_LEVEL, Math.floor(Math.max(0, xp) / XP_PER_LEVEL));
