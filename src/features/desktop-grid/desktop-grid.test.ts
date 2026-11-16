import { describe, expect, it } from "vitest";
import { cellOf, center, freeCell, gridOf, inZone, key, snapAll, type Zone } from "./desktop-grid";

const ZONES: Zone[] = [{ x0: 0, y0: 0, x1: 0.42, y1: 0.36 }];

describe("desktop shortcut grid", () => {
  it("fits 15 columns and 7 rows on a 1600x855 desktop", () => {
    const g = gridOf(1600, 855);
    expect(g.cols).toBe(15);
    expect(g.rows).toBe(7);
  });

  it("snaps a drop onto the nearest cell centre", () => {
    const g = gridOf(1600, 855);
    const cell = freeCell(g, 500, 400, new Set(), []);
    expect(cell).toEqual({ col: Math.floor(500 / g.cw), row: Math.floor(400 / g.ch) });
    const p = center(g, cell!);
    expect(p.x).toBeCloseTo(((cell!.col + 0.5) * g.cw) / g.w, 6);
    expect(p.y).toBeCloseTo(((cell!.row + 0.5) * g.ch) / g.h, 6);
  });

  it("moves to the next free cell instead of stacking two shortcuts", () => {
    const g = gridOf(1600, 855);
    const target = cellOf(g, { x: 500 / g.w, y: 400 / g.h });
    const taken = new Set([key(target)]);
    const cell = freeCell(g, 500, 400, taken, []);
    expect(cell).not.toBeNull();
    expect(cell).not.toEqual(target);
    expect(taken.has(key(cell!))).toBe(false);
  });

  it("refuses cells under the clock and logo zone", () => {
    const g = gridOf(1600, 855);
    const cell = freeCell(g, 200, 100, new Set(), ZONES);
    expect(cell).not.toBeNull();
    expect(inZone(center(g, cell!).x, center(g, cell!).y, ZONES)).toBe(false);
  });

  it("lines every shortcut up on its own cell", () => {
    const g = gridOf(1600, 855);
    const out = snapAll([{ id: "a" }, { id: "b" }], { a: { x: 0.5, y: 0.5 }, b: { x: 0.5, y: 0.5 } }, g, []);
    expect(Object.keys(out)).toHaveLength(2);
    expect(out["a"]).not.toEqual(out["b"]);
  });

  it("gives up when every cell is taken", () => {
    const g = gridOf(300, 240);
    const taken = new Set<string>();
    for (let c = 0; c < g.cols; c++) for (let r = 0; r < g.rows; r++) taken.add(key({ col: c, row: r }));
    expect(freeCell(g, 100, 100, taken, [])).toBeNull();
  });
});
