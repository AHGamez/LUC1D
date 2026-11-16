/** Plain rules for Grassy Plains tag mode (no React / three.js). */
export const TAG_MIN_PLAYERS = 2;
export const TAG_RANGE = 1.8;
export const TAG_IMMUNITY_MS = 3000;

/** Who should be "it": keep the current one if still here, else the first id alphabetically. Null when too few players. */
export function chooseIt(ids: string[], current: string | null): string | null {
  if (ids.length < TAG_MIN_PLAYERS) return null;
  if (current && ids.includes(current)) return current;
  return [...ids].sort()[0] ?? null;
}

type P = { x: number; y: number; z: number };
/** The closest player the tagger can reach, if any. */
export function findTagTarget(me: P, others: { id: string; pos: P }[], range = TAG_RANGE): string | null {
  let best: string | null = null,
    bestD = range;
  for (const o of others) {
    const d = Math.hypot(o.pos.x - me.x, o.pos.y - me.y, o.pos.z - me.z);
    if (d <= bestD) {
      bestD = d;
      best = o.id;
    }
  }
  return best;
}

/** Grassy Plains game modes players can vote for. */
export type PlainsMode = "tag" | "crown";
export const PLAINS_MODES: PlainsMode[] = ["tag", "crown"];

/** Most votes wins; ties (or no votes) keep tag mode. */
export function pickMode(votes: (string | undefined)[]): PlainsMode {
  const crown = votes.filter((v) => v === "crown").length;
  const tag = votes.filter((v) => v === "tag").length;
  return crown > tag ? "crown" : "tag";
}

/** Crown mode: a random player is picked as king. */
export function randomKing(ids: string[], rand = Math.random): string | null {
  if (ids.length < TAG_MIN_PLAYERS) return null;
  return ids[Math.floor(rand() * ids.length)] ?? null;
}

/** Crown mode: a peasant steals the crown by running into the king. */
export function canStealCrown(me: P, king: P, range = TAG_RANGE): boolean {
  return Math.hypot(king.x - me.x, king.y - me.y, king.z - me.z) <= range;
}
