import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cellOf, center, freeCell, gridOf, key, snapAll, type Cell, type Pos, type Zone } from "./desktop-grid";

export type { Zone } from "./desktop-grid";

type PosMap = Record<string, Pos>;
/** Saved positions, per browser. Bump the suffix if the grid rules change. */
const KEY = "luc1d-desktop-icons";

/** Default spot for an icon with no saved position: a column down the right edge. */
const defaultPos = (i: number): Pos => ({ x: 0.94, y: 0.12 + i * 0.13 });

/**
 * Desktop shortcuts that snap to a grid. Drag one and it locks onto the nearest free cell, never under a
 * reserved zone or on another shortcut. A plain click (no drag) opens the app. Positions are kept per browser.
 * Mount it inside a `relative` parent; it fills that parent and sits behind windows that are mounted after it.
 */
export function DesktopIcons({ apps, zones, onOpen, renderIcon }: {
  apps: { id: string; name: string }[];
  zones: Zone[];
  onOpen: (id: string) => void;
  renderIcon: (id: string) => ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PosMap>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<{ id: string; cell: Cell } | null>(null);
  const dragCell = useRef<Cell | null>(null);
  const st = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null);
  const lined = useRef(false);

  useEffect(() => {
    try { setPos(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* ignore a corrupt value */ }
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Once the desktop has been measured, line every shortcut up on the grid (only once per mount).
  useEffect(() => {
    if (lined.current || !size.w || !size.h || !apps.length) return;
    const g = gridOf(size.w, size.h);
    const base: PosMap = {};
    apps.forEach((a, i) => { base[a.id] = pos[a.id] ?? defaultPos(i); });
    const next = snapAll(apps, base, g, zones);
    lined.current = true;
    setPos(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  }, [size, pos, apps, zones]);

  const g = size.w && size.h ? gridOf(size.w, size.h) : null;

  const takenBy = (skip: string) => {
    const t = new Set<string>();
    if (!g) return t;
    for (const a of apps) {
      if (a.id === skip) continue;
      const p = pos[a.id];
      if (p) t.add(key(cellOf(g, p)));
    }
    return t;
  };

  const down = (id: string, e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    st.current = { id, sx: e.clientX, sy: e.clientY, moved: false };
  };

  const move = (id: string, e: ReactPointerEvent<HTMLDivElement>) => {
    const s = st.current, r = box.current?.getBoundingClientRect();
    if (!s || s.id !== id || !r || !g) return;
    if (!s.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) <= 5) return;
    s.moved = true;
    const cell = freeCell(g, e.clientX - r.left, e.clientY - r.top, takenBy(id), zones);
    dragCell.current = cell;
    setDrag(cell ? { id, cell } : null);
  };

  const up = (id: string) => {
    const s = st.current;
    st.current = null;
    const cell = dragCell.current;
    dragCell.current = null;
    setDrag(null);
    if (!s) return;
    if (!s.moved) { onOpen(id); return; }
    if (!cell || !g) return; // nowhere free to drop: leave it where it was
    const next = { ...pos, [id]: center(g, cell) };
    setPos(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  };

  const cancel = () => { st.current = null; dragCell.current = null; setDrag(null); };

  const at = (id: string, i: number): Pos => {
    if (drag && drag.id === id && g) return center(g, drag.cell);
    return pos[id] ?? defaultPos(i);
  };

  const spot = drag && g ? {
    left: `${(drag.cell.col * g.cw) / g.w * 100}%`,
    top: `${(drag.cell.row * g.ch) / g.h * 100}%`,
    width: `${(g.cw / g.w) * 100}%`,
    height: `${(g.ch / g.h) * 100}%`,
  } : null;

  // Keyboard users get the same action as a click.
  const onKey = (id: string, e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(id); }
  };

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-0">
      {drag && g && (
        <div aria-hidden className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.28) 1px, transparent 1px)",
          backgroundSize: `${g.cw}px ${g.ch}px`,
        }} />
      )}
      {drag && spot && (
        <div aria-hidden className="absolute rounded-2xl border-2 border-dashed border-primary/70 bg-primary/10" style={spot} />
      )}
      {apps.map((a, i) => {
        const p = at(a.id, i);
        const dragging = drag?.id === a.id;
        return (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            aria-label={a.name}
            title={a.name}
            className="pointer-events-auto absolute flex w-20 -translate-x-1/2 -translate-y-1/2 touch-none cursor-pointer flex-col items-center gap-1 rounded-2xl text-center focus-visible:outline-2 focus-visible:outline-ring"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transition: dragging ? "left 90ms linear, top 90ms linear" : undefined, zIndex: dragging ? 20 : undefined }}
            onPointerDown={(e) => down(a.id, e)}
            onPointerMove={(e) => move(a.id, e)}
            onPointerUp={() => up(a.id)}
            onPointerCancel={cancel}
            onKeyDown={(e) => onKey(a.id, e)}
          >
            {renderIcon(a.id)}
            <span className="rounded bg-background/60 px-1.5 text-[11px] font-medium text-foreground backdrop-blur">{a.name}</span>
          </div>
        );
      })}
    </div>
  );
}
