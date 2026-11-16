/**
 * Shared helpers for the demo fixtures in src/lib/demo. Fixtures are plain rows keyed by table name,
 * built fresh for each demo client so every page load starts from the same data.
 */

export type DemoRow = Record<string, unknown>;
export type DemoRows = Record<string, DemoRow[]>;

/** The two demo accounts. Passed in from DEMO_ACCOUNTS so the fixtures never hard-code account ids. */
export interface DemoPeople {
  /** Blank Test 1: Discord owner and mod. */
  one: string;
  /** Blank Test 2: regular user. */
  two: string;
}

/** A stable, valid-looking UUID. `prefix` is 8 hex digits; `n` numbers rows within it. */
export function demoId(prefix: string, n: number): string {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const MINUTE = 60_000;

/** ISO timestamp `minutes` before `now`. */
export function minutesAgo(now: number, minutes: number): string {
  return new Date(now - minutes * MINUTE).toISOString();
}
