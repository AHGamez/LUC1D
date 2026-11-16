import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { enabledPets } from "../../lib/fall-event";
import { useShimejiPrefs } from "./shimejiPrefs";

/* Scoped keyframes for the sprites, leaves and steam. Switched off for reduced motion. */
const SJ_CSS = `
@keyframes sj-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes sj-step { 0%, 100% { transform: rotate(-14deg); } 50% { transform: rotate(14deg); } }
@keyframes sj-fight { 0%, 100% { translate: 0 0; } 25% { translate: -3px -2px; } 75% { translate: 3px 0; } }
@keyframes sj-leaf { 0% { transform: translate(0, -10vh) rotate(0); opacity: 0; } 10% { opacity: .9; } 50% { transform: translate(6vw, 50vh) rotate(200deg); } 100% { transform: translate(-3vw, 110vh) rotate(420deg); opacity: .8; } }
@keyframes sj-steam { 0% { transform: translateY(14px) scaleX(1); opacity: 0; } 25% { opacity: .55; } 100% { transform: translateY(-34px) scaleX(1.8); opacity: 0; } }
.sj-bob { animation: sj-bob .5s ease-in-out infinite; }
.sj-leg-a, .sj-leg-b { transform-box: fill-box; transform-origin: top; animation: sj-step .5s ease-in-out infinite; }
.sj-leg-b { animation-direction: reverse; }
.sj-fight { animation: sj-fight .18s linear infinite; }
.sj-leaf { position: absolute; top: 0; animation: sj-leaf linear infinite; }
.sj-steam { width: 6px; height: 44px; border-radius: 9999px; background: linear-gradient(to top, color-mix(in oklab, var(--color-muted-foreground) 80%, transparent), transparent); filter: blur(3px); animation: sj-steam 2.8s ease-out infinite; }
@media (prefers-reduced-motion: reduce) { .sj-bob, .sj-leg-a, .sj-leg-b, .sj-fight, .sj-leaf, .sj-steam { animation: none; } }
`;

/** Injects the scoped keyframes. Render once per tree that shows sprites. */
export function ShimejiStyles() {
  return <style>{SJ_CSS}</style>;
}

const KIDS: Record<string, { hat: string; coat: string; mitt: string; pants: string; wide?: boolean }> = {
  "pet-pompom": { hat: "oklch(0.5 0.15 265)", coat: "oklch(0.5 0.08 50)", mitt: "oklch(0.55 0.2 25)", pants: "oklch(0.45 0.1 260)" },
  "pet-flaps": { hat: "oklch(0.62 0.17 145)", coat: "oklch(0.68 0.17 50)", mitt: "oklch(0.62 0.17 145)", pants: "oklch(0.5 0.12 150)" },
  "pet-chunk": { hat: "oklch(0.75 0.11 215)", coat: "oklch(0.58 0.21 25)", mitt: "oklch(0.85 0.17 95)", pants: "oklch(0.4 0.06 50)", wide: true },
  "pet-parka": { hat: "oklch(0.7 0.18 50)", coat: "oklch(0.7 0.18 50)", mitt: "oklch(0.42 0.08 50)", pants: "oklch(0.7 0.18 50)" },
};

function KidSprite({ kind }: { kind: string }) {
  const k = KIDS[kind];
  if (!k) return null;
  const bw = k.wide ? 30 : 24, bx = 20 - bw / 2;
  const skin = "oklch(0.93 0.04 70)";
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
      <g className="sj-bob">
        <rect x={bx} y="25" width={bw} height="10" rx="3" fill={k.coat} />
        <circle cx={bx} cy="31" r="2.6" fill={k.mitt} /><circle cx={bx + bw} cy="31" r="2.6" fill={k.mitt} />
        {kind === "pet-parka" ? (
          <><ellipse cx="20" cy="15" rx="13" ry="12" fill={k.hat} /><ellipse cx="20" cy="16" rx="7.5" ry="8" fill="oklch(0.38 0.07 45)" /><ellipse cx="20" cy="15.5" rx="5.5" ry="6" fill={skin} /></>
        ) : (
          <ellipse cx="20" cy="17" rx={k.wide ? 14 : 12.5} ry="11" fill={skin} />
        )}
        <circle cx="17.5" cy={kind === "pet-parka" ? 14 : 16} r="2.6" fill="white" stroke="black" strokeWidth=".4" />
        <circle cx="22.5" cy={kind === "pet-parka" ? 14 : 16} r="2.6" fill="white" stroke="black" strokeWidth=".4" />
        <circle cx="18" cy={kind === "pet-parka" ? 14 : 16} r=".7" /><circle cx="22" cy={kind === "pet-parka" ? 14 : 16} r=".7" />
        {kind === "pet-pompom" && <><path d="M8 13 Q20 -2 32 13 Z" fill={k.hat} /><rect x="7.5" y="11" width="25" height="3" rx="1.5" fill="oklch(0.55 0.2 25)" /><circle cx="20" cy="3.5" r="2.5" fill="oklch(0.55 0.2 25)" /></>}
        {kind === "pet-flaps" && <><path d="M7 13 Q8 3 20 3 Q32 3 33 13 Z" fill={k.hat} /><rect x="5" y="9" width="4" height="12" rx="2" fill={k.hat} /><rect x="31" y="9" width="4" height="12" rx="2" fill={k.hat} /></>}
        {kind === "pet-chunk" && <><path d="M7 12 Q8 3 20 3 Q32 3 33 12 Z" fill={k.hat} /><rect x="6.5" y="10" width="27" height="3" rx="1.5" fill="oklch(0.85 0.17 95)" /><circle cx="20" cy="3" r="1.8" fill="oklch(0.85 0.17 95)" /></>}
      </g>
      <g fill={k.pants}><rect x="14" y="35" width="5" height="3" rx="1" className="sj-leg-a" /><rect x="21" y="35" width="5" height="3" rx="1" className="sj-leg-b" /></g>
    </svg>
  );
}

/** Pixel sprite for one Shimeji id. Pair with ShimejiStyles on the same screen so the animation runs. */
export function ShimejiSprite({ kind }: { kind: string }) {
  if (KIDS[kind]) return <KidSprite kind={kind} />;
  if (kind === "pet-miner") {
    return (
      <svg viewBox="0 0 16 32" className="h-full w-full" aria-hidden shapeRendering="crispEdges">
        <g className="sj-bob">
          <rect x="4" y="0" width="8" height="8" fill="#b4866a" />
          <rect x="4" y="0" width="8" height="2" fill="#3b2a1d" />
          <rect x="4" y="2" width="1" height="1" fill="#3b2a1d" /><rect x="11" y="2" width="1" height="1" fill="#3b2a1d" />
          <rect x="5" y="4" width="1" height="1" fill="#fff" /><rect x="6" y="4" width="1" height="1" fill="#4a3a8c" />
          <rect x="9" y="4" width="1" height="1" fill="#4a3a8c" /><rect x="10" y="4" width="1" height="1" fill="#fff" />
          <rect x="7" y="5" width="2" height="1" fill="#8a5a44" />
          <rect x="6" y="6" width="4" height="1" fill="#5a3a28" />
          <rect x="4" y="8" width="8" height="12" fill="#2fb5b0" />
          <rect x="1" y="8" width="3" height="11" fill="#2fb5b0" className="sj-leg-a" />
          <rect x="12" y="8" width="3" height="11" fill="#2fb5b0" className="sj-leg-b" />
          <rect x="1" y="15" width="3" height="4" fill="#b4866a" /><rect x="12" y="15" width="3" height="4" fill="#b4866a" />
        </g>
        <rect x="4" y="20" width="4" height="10" fill="#3b3fa8" className="sj-leg-a" />
        <rect x="8" y="20" width="4" height="10" fill="#3b3fa8" className="sj-leg-b" />
        <rect x="4" y="30" width="8" height="2" fill="#6b6b6b" />
      </svg>
    );
  }
  if (kind === "pet-turkey") {
    return (
      <svg viewBox="0 0 40 32" className="h-full w-full" aria-hidden>
        <g className="sj-bob">
          <path d="M8 18 C2 4 14 0 16 12 C16 0 26 0 24 12 C28 2 38 6 30 18 Z" fill="oklch(0.6 0.16 45)" />
          <path d="M10 18 C6 8 14 6 17 14 C18 6 24 6 23 14 C26 8 33 10 28 18 Z" fill="oklch(0.75 0.15 75)" />
          <ellipse cx="20" cy="21" rx="9" ry="7" fill="oklch(0.42 0.08 50)" />
          <circle cx="29" cy="14" r="4" fill="oklch(0.45 0.08 50)" />
          <circle cx="30" cy="13" r="0.9" fill="black" />
          <path d="M33 14 l3 1 -3 1 z" fill="oklch(0.8 0.15 85)" />
          <path d="M31 16 q1 4 -1 5" stroke="oklch(0.6 0.2 25)" strokeWidth="1.6" fill="none" />
        </g>
        <g stroke="oklch(0.8 0.15 85)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="17" y1="27" x2="16" y2="31" className="sj-leg-a" />
          <line x1="23" y1="27" x2="24" y2="31" className="sj-leg-b" />
        </g>
      </svg>
    );
  }
  if (kind === "pet-santa") {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
        <g className="sj-bob">
          <rect x="9" y="22" width="22" height="13" rx="4" fill="oklch(0.55 0.21 25)" />
          <rect x="9" y="28" width="22" height="3" fill="oklch(0.25 0.02 50)" /><rect x="18" y="28" width="4" height="3" fill="oklch(0.85 0.15 90)" />
          <circle cx="9" cy="28" r="2.8" fill="white" /><circle cx="31" cy="28" r="2.8" fill="white" />
          <ellipse cx="20" cy="15" rx="9" ry="8" fill="oklch(0.9 0.05 60)" />
          <path d="M11 16 Q20 32 29 16 Q25 22 20 21 Q15 22 11 16 Z" fill="white" />
          <circle cx="17" cy="13.5" r="1" /><circle cx="23" cy="13.5" r="1" />
          <circle cx="20" cy="16.5" r="1.6" fill="oklch(0.7 0.15 20)" />
          <path d="M10 10 Q20 -4 31 6 L30 10 Z" fill="oklch(0.55 0.21 25)" />
          <rect x="9.5" y="8.5" width="21" height="3.5" rx="1.7" fill="white" /><circle cx="32" cy="6" r="2.4" fill="white" />
        </g>
        <g fill="oklch(0.25 0.02 50)"><rect x="12" y="35" width="6" height="3" rx="1" className="sj-leg-a" /><rect x="22" y="35" width="6" height="3" rx="1" className="sj-leg-b" /></g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" className="text-foreground">
        <circle cx="12" cy="5" r="3.5" />
        <line x1="12" y1="9" x2="12" y2="20" />
        <line x1="12" y1="12" x2="6" y2="17" className="sj-leg-a" />
        <line x1="12" y1="12" x2="18" y2="17" className="sj-leg-b" />
        <line x1="12" y1="20" x2="7" y2="30" className="sj-leg-a" />
        <line x1="12" y1="20" x2="17" y2="30" className="sj-leg-b" />
      </g>
    </svg>
  );
}

type Pet = { id: string; x: number; y: number; vx: number; vy: number; lane: "top" | "bottom" | "air"; dir: 1 | -1; flip: number; fight: number; cool: number; land: "top" | "bottom"; drag?: boolean };
const SIZE = 28;
/** On phones the walkers run at about 20 frames a second to save battery. */
const MOBILE_FRAME_MS = 50;

/**
 * Owned Shimejis walk the tab bar, parkour down to the bottom of the screen and back, and scrap when they meet.
 * Each one can be switched off in Settings (see useShimejiPrefs). Pets can be dragged; they do not grab the cursor.
 */
export function ShimejiWalkers({ enabled, mobile = false }: { enabled: boolean; mobile?: boolean }) {
  const { disabledPets } = useShimejiPrefs();
  const [owned, setOwned] = useState<string[]>([]);
  const [, tick] = useState(0);
  const state = useRef<Pet[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: rows } = await supabase.from("club_owned").select("item_id").eq("user_id", data.user.id).like("item_id", "pet-%");
      if (alive) setOwned((rows ?? []).map((r) => r.item_id));
    });
    void load();
    window.addEventListener("luc1d-pets", load);
    const t = window.setInterval(load, 30000);
    return () => { alive = false; window.removeEventListener("luc1d-pets", load); window.clearInterval(t); };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const pets = enabledPets(owned, disabledPets, mobile);
    if (!pets.length) { state.current = []; tick((n) => n + 1); return; }
    const topY = () => (document.querySelector('[aria-label="Open tabs"]')?.getBoundingClientRect().bottom ?? 40) - SIZE;
    const botY = () => window.innerHeight - SIZE - 4;
    state.current = pets.map((id, i) => {
      const old = state.current.find((p) => p.id === id);
      return old ?? { id, x: 120 + i * 200, y: topY(), vx: 0, vy: 0, lane: "top", dir: i % 2 ? -1 : 1, flip: 0, fight: 0, cool: 200, land: "top" };
    });
    // Reduced motion keeps the pets still on every device.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, lastFrame = 0;
    const step = (time: number) => {
      if (document.hidden || (mobile && time - lastFrame < MOBILE_FRAME_MS)) { raf = requestAnimationFrame(step); return; }
      lastFrame = time;
      const W = window.innerWidth;
      for (const p of state.current) {
        if (p.drag) continue;
        if (p.fight > 0) { p.fight--; continue; }
        if (p.cool > 0) p.cool--;
        if (p.lane === "air") {
          p.vy += 0.5; p.x += p.vx; p.y += p.vy; p.flip += 0.25 * p.dir;
          const target = p.land === "top" ? topY() : botY();
          if (p.vy > 0 && p.y >= target) { p.y = target; p.lane = p.land; p.vy = 0; p.flip = 0; p.cool = 240; }
        } else {
          p.x += 1.2 * p.dir;
          p.y = p.lane === "top" ? topY() : botY();
          if (p.x < 0) { p.x = 0; p.dir = 1; } if (p.x > W - SIZE) { p.x = W - SIZE; p.dir = -1; }
          if (p.cool === 0 && Math.random() < 0.006) {
            // parkour: hop off the tab bar to the floor, or a big leap back up
            p.land = p.lane === "top" ? "bottom" : "top";
            p.vx = 3 * p.dir;
            p.vy = p.land === "top" ? -Math.sqrt(2 * 0.5 * (p.y - topY() + 60)) : -7;
            p.lane = "air";
          } else if (Math.random() < 0.003) p.dir = (p.dir * -1) as 1 | -1;
        }
      }
      const ps = state.current;
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (!a || !b) continue;
        if (!a.drag && !b.drag && a.lane !== "air" && a.lane === b.lane && !a.fight && !b.fight && a.cool < 120 && b.cool < 120 && Math.abs(a.x - b.x) < SIZE) {
          a.fight = b.fight = 150; a.cool = b.cool = 400;
          a.dir = a.x < b.x ? 1 : -1; b.dir = (a.dir * -1) as 1 | -1;
        }
        if (a.fight === 1) { a.dir = (a.dir * -1) as 1 | -1; b.dir = (b.dir * -1) as 1 | -1; }
      }
      tick((n) => n + 1);
      raf = requestAnimationFrame(step);
    };
    if (!reduce) raf = requestAnimationFrame(step); else tick((n) => n + 1);
    return () => cancelAnimationFrame(raf);
  }, [enabled, owned, disabledPets, mobile]);

  if (!enabled || !state.current.length || typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <ShimejiStyles />
      {state.current.map((p) => (
        <div key={p.id} data-shimeji={p.id} className={`pointer-events-auto absolute touch-none ${p.drag ? "cursor-grabbing" : "cursor-grab"} ${p.fight ? "sj-fight" : ""}`} style={{ left: p.x, top: p.y, width: SIZE, height: SIZE, transform: `scaleX(${p.dir}) rotate(${p.drag ? Math.sin(Date.now() / 120) * 0.3 : p.flip}rad)` }}
          onPointerDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            p.drag = true; p.fight = 0; p.flip = 0; tick((n) => n + 1);
          }}
          onPointerMove={(e) => { if (!p.drag) return; p.x = e.clientX - SIZE / 2; p.y = e.clientY - SIZE / 2; tick((n) => n + 1); }}
          onPointerUp={() => {
            if (!p.drag) return;
            p.drag = false;
            const top = (document.querySelector('[aria-label="Open tabs"]')?.getBoundingClientRect().bottom ?? 40) - SIZE;
            p.land = p.y <= top + 4 ? "top" : "bottom";
            p.lane = "air"; p.vx = 0; p.vy = 0; p.cool = 120;
            if (p.land === "top") p.y = Math.min(p.y, top);
          }}>
          <ShimejiSprite kind={p.id} />
          {p.fight > 0 && p.fight % 30 < 15 && <span className="absolute -top-4 left-1 text-xs">💥</span>}
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function FallLeaves({ count = 28 }: { count?: number }) {
  const [leaves, setLeaves] = useState<{ x: number; s: number; d: number; delay: number; h: number; e: string }[]>([]);
  useEffect(() => {
    setLeaves(Array.from({ length: count }, () => ({ x: Math.random() * 100, s: 12 + Math.random() * 14, d: 9 + Math.random() * 10, delay: -Math.random() * 18, h: 30 + Math.random() * 45, e: ["🍂", "🍁", "🍃"][Math.floor(Math.random() * 3)] ?? "🍂" })));
  }, [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <ShimejiStyles />
      {leaves.map((l, i) => (
        <span key={i} className="sj-leaf" style={{ left: `${l.x}%`, fontSize: l.s, animationDuration: `${l.d}s`, animationDelay: `${l.delay}s`, filter: `hue-rotate(${l.h - 40}deg)` }}>{l.e}</span>
      ))}
    </div>
  );
}

export function LogoSteam() {
  return (
    <div className="pointer-events-none absolute -top-16 left-1/2 flex h-16 w-40 -translate-x-1/2 justify-center gap-5" aria-hidden>
      <ShimejiStyles />
      {[0, 1, 2].map((i) => <span key={i} className="sj-steam" style={{ animationDelay: `${i * 0.9}s` }} />)}
    </div>
  );
}
