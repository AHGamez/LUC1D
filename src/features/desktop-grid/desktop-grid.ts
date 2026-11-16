// Grid maths for the desktop shortcuts: everything is stored as fractions of the
// desktop, so these helpers convert between pixels, cells and reserved zones.

export type Zone = { x0: number; y0: number; x1: number; y1: number };
export type Pos = { x: number; y: number };
export type Cell = { col: number; row: number };
export type Grid = { cols: number; rows: number; cw: number; ch: number; w: number; h: number };

export const CELL_W = 104;
export const CELL_H = 112;

/** True when a point (fractions of the desktop) sits inside a reserved zone. */
export function inZone(x: number, y: number, zones: Zone[]) {
  return zones.some((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
}

/** How many whole shortcut cells fit in a desktop of w x h pixels. */
export function gridOf(w: number, h: number): Grid {
  const cols = Math.max(1, Math.floor(w / CELL_W));
  const rows = Math.max(1, Math.floor(h / CELL_H));
  return { cols, rows, cw: w / cols, ch: h / rows, w, h };
}

/** Centre of a cell, as fractions of the desktop. */
export function center(g: Grid, { col, row }: Cell): Pos {
  return { x: ((col + 0.5) * g.cw) / g.w, y: ((row + 0.5) * g.ch) / g.h };
}

/** Which cell a stored (possibly off-grid) position belongs to. */
export function cellOf(g: Grid, p: Pos): Cell {
  return {
    col: Math.min(g.cols - 1, Math.max(0, Math.floor((p.x * g.w) / g.cw))),
    row: Math.min(g.rows - 1, Math.max(0, Math.floor((p.y * g.h) / g.ch))),
  };
}

export const key = (c: Cell) => `${c.col},${c.row}`;

/**
 * Nearest cell to a drop point (in desktop pixels) that is neither already taken
 * nor under a reserved zone. Returns null when the desktop has no room left.
 */
export function freeCell(g: Grid, px: number, py: number, taken: Set<string>, zones: Zone[]): Cell | null {
  const start = cellOf(g, { x: px / g.w, y: py / g.h });
  const span = Math.max(g.cols, g.rows);
  for (let ring = 0; ring <= span; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const cell = { col: start.col + dc, row: start.row + dr };
        if (cell.col < 0 || cell.row < 0 || cell.col >= g.cols || cell.row >= g.rows) continue;
        if (taken.has(key(cell))) continue;
        const p = center(g, cell);
        if (inZone(p.x, p.y, zones)) continue;
        return cell;
      }
    }
  }
  return null;
}

/** Line every shortcut up on its own cell, keeping each one as close to `pos` as possible. */
export function snapAll(apps: { id: string }[], pos: Record<string, Pos>, g: Grid, zones: Zone[]): Record<string, Pos> {
  const taken = new Set<string>();
  const out: Record<string, Pos> = {};
  for (const a of apps) {
    const p = pos[a.id];
    if (!p) continue;
    const cell = freeCell(g, p.x * g.w, p.y * g.h, taken, zones);
    if (!cell) continue;
    taken.add(key(cell));
    out[a.id] = center(g, cell);
  }
  return out;
}
