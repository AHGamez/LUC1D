export const HUNT_INTERVAL_MS = 2 * 60 * 60 * 1000;
export const HUNT_DURATION_MS = 10 * 60 * 1000;
export const TURKEY_MIN_CENTS = 10;
export const TURKEY_MAX_CENTS = 1000;
export const TURKEY_SHOP = [
  { id: "pet-turkey", name: "Turkey Shimeji", cents: 2000, kind: "pet" },
  { id: "ring-leaves", name: "Leaves ring", cents: 1500, kind: "ring" },
  { id: "ring-gobbler", name: "Gobbler ring", cents: 3000, kind: "ring" },
] as const;
export const turkeyMoney = (cents: number) => `${(cents / 100).toFixed(2)} TC`;
export function huntWindow(now: number) {
  const start = Math.floor(now / HUNT_INTERVAL_MS) * HUNT_INTERVAL_MS;
  return { start, active: now < start + HUNT_DURATION_MS, next: start + HUNT_INTERVAL_MS, end: start + HUNT_DURATION_MS };
}
export function enabledPets(owned: string[], disabled: string[], mobile: boolean) {
  const selected = owned.filter((id) => !disabled.includes(id));
  return mobile ? selected.slice(0, 2) : selected;
}