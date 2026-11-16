/** Grassy Plains Christmas: hourly snow schedule and the 10 hidden presents (no React / three). */
export const SNOW_MINUTES = 10;
/** Snow falls for the first SNOW_MINUTES of every hour. */
export function snowActive(d: Date) {
  return d.getMinutes() < SNOW_MINUTES;
}
// Deterministic scatter so every player sees the same trees (shared with the scene).
const rand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
export const TREES: [number, number, number][] = Array.from({ length: 70 }, (_, i) => {
  const a = rand(i) * Math.PI * 2, r = 22 + rand(i + 99) * 90;
  return [Math.cos(a) * r, Math.sin(a) * r, 0.8 + rand(i + 7) * 0.6] as [number, number, number];
}).filter(([x, z]) => Math.abs(Math.hypot(x, z) - 60) > 6);
/** Hidden presents: 5 tucked under tree branches, 3 inside the village houses, 2 in the car garage. */
const SPOTS: [number, number][] = [
  ...[3, 14, 27, 41, 55].map((i) => { const [x, z, s] = TREES[i % TREES.length]!; return [x + 2.1 * s, z] as [number, number]; }),
  [8, -12], [-40, 30], [45, 38],
  [-9, -426], [9, -414],
];
export const PRESENTS: { id: number; x: number; z: number; color: string }[] = SPOTS.map(([x, z], i) => ({ id: i, x, z, color: ["#d62828", "#2a9d4b", "#2f6fd6", "#f2c230", "#a14bd6"][i % 5]! }));
export const PRESENT_RANGE = 2.2;
export function nearPresent(x: number, z: number, found: ReadonlySet<number>) {
  return PRESENTS.find((p) => !found.has(p.id) && Math.hypot(p.x - x, p.z - z) < PRESENT_RANGE);
}
export const allFound = (found: ReadonlySet<number>) => PRESENTS.every((p) => found.has(p.id));

/** Christmas release: midnight Nov 16, 2026 in the viewer's local time (same moment as the desktop-wide gate). */
export const XMAS_RELEASE = new Date(2026, 10, 16, 0, 0, 0).getTime();
export const xmasReleased = (now = Date.now()) => now >= XMAS_RELEASE;
