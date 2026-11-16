/** Ten house plots along the north and south edges of Grassy Plains. */
export const PLOT_PRICE = 2500; // cents; mirrors lublox_plot_price() in the database
export const PLOT_SIZE = 16;
export const PLOTS = Array.from({ length: 10 }, (_, i) => ({
  plot: i + 1,
  x: -80 + (i % 5) * 40,
  z: i < 5 ? -128 : 128,
  rot: i < 5 ? 0 : Math.PI,
}));
export const HOUSES = [
  { id: "house-cottage", name: "Cottage" },
  { id: "house-villa", name: "Villa" },
  { id: "house-mansion", name: "Mansion" },
] as const;
export function nearestPlot(p: { x: number; z: number }) {
  return PLOTS.find((q) => Math.abs(p.x - q.x) <= PLOT_SIZE / 2 + 2 && Math.abs(p.z - q.z) <= PLOT_SIZE / 2 + 2) ?? null;
}
