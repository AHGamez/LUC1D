// Display helpers for the AFK Lounge. The server (lounge_afk_tick, migration 0075) is the only source of truth
// for time counted and money paid. These mirror its rule so the UI and tests can check it; nothing here pays out.
export const AFK_HOUR_SECONDS = 3600;
export const AFK_HOUR_CENTS = 1000;

/** Whole completed hours times the hourly reward, as the SQL computes it. Used by tests and labels only. */
export function afkRewardCents(seconds: number) {
  return Math.floor(Math.max(0, seconds) / AFK_HOUR_SECONDS) * AFK_HOUR_CENTS;
}

export function afkTime(seconds: number) {
  const remaining = Math.max(0, AFK_HOUR_SECONDS - seconds);
  return `${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
}