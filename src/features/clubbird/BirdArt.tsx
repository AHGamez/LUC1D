import type { ReactNode } from "react";
import { CLUB_ITEMS, birdColor } from "./club-items";
import { RingDecoration } from "./RingDecoration";

export const W = 1000;
export const H = 600;

export type Pos = { x: number; y: number; face: 1 | -1; say?: string; sayAt?: number };
export type Look = { color: string; hat: string; tag?: string; name: string };

/** Shop house icons and room art are plain SVG, so they keep their own world colours. */
export function MiniBird({ color, hat }: { color: string; hat: string }) {
  return (
    <svg viewBox="-40 -60 80 80" className="h-14 w-14" aria-hidden="true">
      <BirdBody color={birdColor(color)} hat={hat} />
    </svg>
  );
}

function BirdBody({ color, hat }: { color: string; hat: string }) {
  return (
    <g>
      <ellipse cx="0" cy="14" rx="20" ry="4" fill="black" opacity=".25" />
      <line x1="-5" y1="4" x2="-6" y2="14" stroke="#e89a2c" strokeWidth="3" />
      <line x1="5" y1="4" x2="6" y2="14" stroke="#e89a2c" strokeWidth="3" />
      <ellipse cx="0" cy="-10" rx="18" ry="16" fill={color} />
      <ellipse cx="-6" cy="-6" rx="9" ry="7" fill="white" opacity=".35" />
      <path d="M-14 -12 Q-24 -6 -14 0Z" fill={color} stroke="black" strokeOpacity=".15" />
      <circle cx="7" cy="-16" r="3.5" fill="white" />
      <circle cx="8" cy="-16" r="2" fill="#111" />
      <path d="M16 -13 L26 -10 L16 -7Z" fill="#f5a524" />
      {hat === "hat-cap" && (
        <g>
          <path d="M-12 -24 Q0 -36 12 -24Z" fill="#e5484d" />
          <rect x="8" y="-26" width="14" height="3" rx="1.5" fill="#c13b40" />
        </g>
      )}
      {hat === "hat-tophat" && (
        <g>
          <rect x="-12" y="-28" width="24" height="3" fill="#111" />
          <rect x="-8" y="-46" width="16" height="19" fill="#111" />
          <rect x="-8" y="-32" width="16" height="3" fill="#b91c1c" />
        </g>
      )}
      {hat === "hat-shades" && (
        <g>
          <rect x="0" y="-20" width="16" height="6" rx="2" fill="#111" />
          <line x1="-6" y1="-18" x2="0" y2="-18" stroke="#111" strokeWidth="2" />
        </g>
      )}
      {hat === "hat-halo" && <ellipse cx="0" cy="-34" rx="12" ry="3.5" fill="none" stroke="#fde68a" strokeWidth="2.5" />}
      {hat === "hat-crown" && <path d="M-11 -24 L-11 -36 L-5 -30 L0 -40 L5 -30 L11 -36 L11 -24Z" fill="#f5c542" stroke="#b7791f" />}
    </g>
  );
}

/** A bird in the world. `me` birds are drawn bolder and do not animate their position. */
export function Bird({ p, look, me, weapon }: { p: Pos; look?: Look | undefined; me?: boolean; weapon?: ReactNode }) {
  const speaking = p.say && p.sayAt && Date.now() - p.sayAt < 6000;
  return (
    <g transform={`translate(${p.x} ${p.y})`} className={me ? undefined : "motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-linear"}>
      <g transform={`scale(${p.face} 1)`}>
        <BirdBody color={birdColor(look?.color)} hat={look?.hat ?? "none"} />
        {weapon}
      </g>
      <text y="32" textAnchor="middle" fontSize="13" fontWeight={me ? 700 : 500} fill="white" stroke="black" strokeWidth="3" paintOrder="stroke">
        {look?.name ?? "bird"}
      </text>
      {speaking && p.say && (
        <g transform="translate(0 -62)">
          <rect x={-Math.min(140, p.say.length * 4 + 14)} y="-14" width={Math.min(280, p.say.length * 8 + 28)} height="24" rx="12" fill="white" />
          <text y="3" textAnchor="middle" fontSize="12" fill="#111">
            {p.say.length > 34 ? p.say.slice(0, 33) + "…" : p.say}
          </text>
        </g>
      )}
    </g>
  );
}

export function Plaza({ owned }: { owned: boolean }) {
  return (
    <g>
      <rect width={W} height={H} fill="#87c6f0" />
      <circle cx="880" cy="70" r="36" fill="#fde68a" />
      <rect y="200" width={W} height={400} fill="#6cbf5a" />
      <path d={`M0 230 Q250 205 500 228 T${W} 222 V260 H0Z`} fill="#5aa94b" />
      {/* Shop */}
      <rect x="80" y="90" width="180" height="150" rx="6" fill="#f3d9a4" />
      <path d="M70 95 L170 40 L270 95Z" fill="#c2410c" />
      <rect x="80" y="100" width="180" height="22" fill="#e5484d" />
      <text x="170" y="116" textAnchor="middle" fontSize="15" fontWeight="800" fill="white">BIRD SHOP</text>
      <rect x="150" y="185" width="40" height="55" rx="4" fill="#7c4a1e" />
      <rect x="95" y="140" width="40" height="32" fill="#bfe3ff" />
      <rect x="205" y="140" width="40" height="32" fill="#bfe3ff" />
      {/* Home plot */}
      {owned ? (
        <g>
          <rect x="770" y="110" width="140" height="130" fill="#e7e2f8" />
          <path d="M755 115 L840 55 L925 115Z" fill="#6d28d9" />
          <rect x="820" y="185" width="40" height="55" rx="4" fill="#4c1d95" />
          <text x="840" y="100" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">MY HOUSE</text>
        </g>
      ) : (
        <g>
          <rect x="770" y="150" width="140" height="90" fill="none" stroke="#fff" strokeDasharray="8 6" strokeWidth="3" />
          <text x="840" y="200" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">FOR SALE</text>
        </g>
      )}
      {/* Hangout */}
      <ellipse cx="500" cy="400" rx="160" ry="60" fill="#d6c7a1" />
      <ellipse cx="500" cy="390" rx="55" ry="22" fill="#9ca3af" />
      <ellipse cx="500" cy="386" rx="44" ry="16" fill="#60a5fa" />
      <path d="M500 386 Q496 350 500 340 Q504 350 500 386" fill="#bfdbfe" />
      <rect x="370" y="440" width="70" height="10" rx="3" fill="#92400e" />
      <rect x="560" y="440" width="70" height="10" rx="3" fill="#92400e" />
      <text x="500" y="485" textAnchor="middle" fontSize="13" fontWeight="700" fill="#5b4a26" opacity=".7">HANGOUT SPOT</text>
      {[[60, 320], [950, 360], [300, 560], [720, 540]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x - 5} y={y - 10} width="10" height="30" fill="#7c4a1e" />
          <circle cx={x} cy={y - 22} r="26" fill="#3f8f3a" />
        </g>
      ))}
    </g>
  );
}

export function HouseRoom({ kind }: { kind: string }) {
  const wall = kind === "house-mansion" ? "#3b2a5a" : kind === "house-villa" ? "#f4e1c1" : "#e9d5b7";
  const floor = kind === "house-mansion" ? "#1f1533" : kind === "house-villa" ? "#c08457" : "#a87c4f";
  return (
    <g>
      <rect width={W} height={H} fill={wall} />
      <rect y="200" width={W} height={400} fill={floor} />
      <rect x="120" y="60" width="140" height="100" fill="#bfe3ff" stroke="#fff" strokeWidth="6" />
      <rect x="740" y="60" width="140" height="100" fill="#bfe3ff" stroke="#fff" strokeWidth="6" />
      <rect x="360" y="230" width="280" height="70" rx="20" fill={kind === "house-mansion" ? "#a21caf" : "#3b82f6"} />
      <rect x="380" y="320" width="240" height="90" rx="8" fill="#ffffff22" />
      <rect x="120" y="260" width="90" height="60" fill="#7c4a1e" />
      <circle cx="840" cy="280" r="30" fill="#3f8f3a" />
      {kind === "house-mansion" && (
        <g>
          <path d="M440 30 L560 30 L540 70 L460 70Z" fill="#f5c542" />
          <circle cx="500" cy="80" r="8" fill="#fde68a" />
        </g>
      )}
      <rect x="470" y="540" width="60" height="60" fill="#5b3714" />
      <text x="500" y="535" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">EXIT</text>
      <text x="500" y="190" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" opacity=".8">
        {CLUB_ITEMS.find((i) => i.id === kind)?.name.toUpperCase()}
      </text>
    </g>
  );
}

export function HouseIcon({ kind }: { kind: string }) {
  const c = kind === "house-mansion" ? "#6d28d9" : kind === "house-villa" ? "#0e7490" : "#c2410c";
  const w = kind === "house-mansion" ? 56 : kind === "house-villa" ? 46 : 36;
  return (
    <svg viewBox="0 0 60 50" className="h-12 w-14" aria-hidden="true">
      <rect x={30 - w / 2} y="20" width={w} height="28" fill="#f3d9a4" />
      <path d={`M${30 - w / 2 - 4} 22 L30 4 L${30 + w / 2 + 4} 22Z`} fill={c} />
      <rect x="26" y="32" width="8" height="16" fill="#7c4a1e" />
    </svg>
  );
}

/** Ring preview for the shop and the Battle Pass. The parent must be `relative`. */
export function RingPreview({ id }: { id: string }) {
  return (
    <div className="relative mx-auto size-12 rounded-full bg-primary">
      <RingDecoration decoration={id} />
    </div>
  );
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
  const bw = k.wide ? 30 : 24;
  const bx = 20 - bw / 2;
  const skin = "oklch(0.93 0.04 70)";
  const parka = kind === "pet-parka";
  const eyeY = parka ? 14 : 16;
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <g className="club-pet-bob">
        <rect x={bx} y="25" width={bw} height="10" rx="3" fill={k.coat} />
        <circle cx={bx} cy="31" r="2.6" fill={k.mitt} />
        <circle cx={bx + bw} cy="31" r="2.6" fill={k.mitt} />
        {parka ? (
          <>
            <ellipse cx="20" cy="15" rx="13" ry="12" fill={k.hat} />
            <ellipse cx="20" cy="16" rx="7.5" ry="8" fill="oklch(0.38 0.07 45)" />
            <ellipse cx="20" cy="15.5" rx="5.5" ry="6" fill={skin} />
          </>
        ) : (
          <ellipse cx="20" cy="17" rx={k.wide ? 14 : 12.5} ry="11" fill={skin} />
        )}
        <circle cx="17.5" cy={eyeY} r="2.6" fill="white" stroke="black" strokeWidth=".4" />
        <circle cx="22.5" cy={eyeY} r="2.6" fill="white" stroke="black" strokeWidth=".4" />
        <circle cx="18" cy={eyeY} r=".7" />
        <circle cx="22" cy={eyeY} r=".7" />
        {kind === "pet-pompom" && (
          <>
            <path d="M8 13 Q20 -2 32 13 Z" fill={k.hat} />
            <rect x="7.5" y="11" width="25" height="3" rx="1.5" fill="oklch(0.55 0.2 25)" />
            <circle cx="20" cy="3.5" r="2.5" fill="oklch(0.55 0.2 25)" />
          </>
        )}
        {kind === "pet-flaps" && (
          <>
            <path d="M7 13 Q8 3 20 3 Q32 3 33 13 Z" fill={k.hat} />
            <rect x="5" y="9" width="4" height="12" rx="2" fill={k.hat} />
            <rect x="31" y="9" width="4" height="12" rx="2" fill={k.hat} />
          </>
        )}
        {kind === "pet-chunk" && (
          <>
            <path d="M7 12 Q8 3 20 3 Q32 3 33 12 Z" fill={k.hat} />
            <rect x="6.5" y="10" width="27" height="3" rx="1.5" fill="oklch(0.85 0.17 95)" />
            <circle cx="20" cy="3" r="1.8" fill="oklch(0.85 0.17 95)" />
          </>
        )}
      </g>
      <g fill={k.pants}>
        <rect x="14" y="35" width="5" height="3" rx="1" className="club-pet-leg-a" />
        <rect x="21" y="35" width="5" height="3" rx="1" className="club-pet-leg-b" />
      </g>
    </svg>
  );
}

/** Shop preview for the pet items. The walking pets themselves are drawn by the desktop shell. */
export function PetSprite({ kind }: { kind: string }) {
  if (KIDS[kind]) return <KidSprite kind={kind} />;
  if (kind === "pet-miner") {
    return (
      <svg viewBox="0 0 16 32" className="h-full w-full" aria-hidden="true" shapeRendering="crispEdges">
        <g className="club-pet-bob">
          <rect x="4" y="0" width="8" height="8" fill="#b4866a" />
          <rect x="4" y="0" width="8" height="2" fill="#3b2a1d" />
          <rect x="4" y="2" width="1" height="1" fill="#3b2a1d" />
          <rect x="11" y="2" width="1" height="1" fill="#3b2a1d" />
          <rect x="5" y="4" width="1" height="1" fill="#fff" />
          <rect x="6" y="4" width="1" height="1" fill="#4a3a8c" />
          <rect x="9" y="4" width="1" height="1" fill="#4a3a8c" />
          <rect x="10" y="4" width="1" height="1" fill="#fff" />
          <rect x="7" y="5" width="2" height="1" fill="#8a5a44" />
          <rect x="6" y="6" width="4" height="1" fill="#5a3a28" />
          <rect x="4" y="8" width="8" height="12" fill="#2fb5b0" />
          <rect x="1" y="8" width="3" height="11" fill="#2fb5b0" className="club-pet-leg-a" />
          <rect x="12" y="8" width="3" height="11" fill="#2fb5b0" className="club-pet-leg-b" />
          <rect x="1" y="15" width="3" height="4" fill="#b4866a" />
          <rect x="12" y="15" width="3" height="4" fill="#b4866a" />
        </g>
        <rect x="4" y="20" width="4" height="10" fill="#3b3fa8" className="club-pet-leg-a" />
        <rect x="8" y="20" width="4" height="10" fill="#3b3fa8" className="club-pet-leg-b" />
        <rect x="4" y="30" width="8" height="2" fill="#6b6b6b" />
      </svg>
    );
  }
  if (kind === "pet-santa") {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
        <g className="club-pet-bob">
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
        <g fill="oklch(0.25 0.02 50)"><rect x="12" y="35" width="6" height="3" rx="1" className="club-pet-leg-a" /><rect x="22" y="35" width="6" height="3" rx="1" className="club-pet-leg-b" /></g>
      </svg>
    );
  }
  if (kind === "pet-turkey") {
    return (
      <svg viewBox="0 0 40 32" className="h-full w-full" aria-hidden="true">
        <g className="club-pet-bob">
          <path d="M8 18 C2 4 14 0 16 12 C16 0 26 0 24 12 C28 2 38 6 30 18 Z" fill="oklch(0.6 0.16 45)" />
          <path d="M10 18 C6 8 14 6 17 14 C18 6 24 6 23 14 C26 8 33 10 28 18 Z" fill="oklch(0.75 0.15 75)" />
          <ellipse cx="20" cy="21" rx="9" ry="7" fill="oklch(0.42 0.08 50)" />
          <circle cx="29" cy="14" r="4" fill="oklch(0.45 0.08 50)" />
          <circle cx="30" cy="13" r="0.9" fill="black" />
          <path d="M33 14 l3 1 -3 1 z" fill="oklch(0.8 0.15 85)" />
          <path d="M31 16 q1 4 -1 5" stroke="oklch(0.6 0.2 25)" strokeWidth="1.6" fill="none" />
        </g>
        <g stroke="oklch(0.8 0.15 85)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="17" y1="27" x2="16" y2="31" className="club-pet-leg-a" />
          <line x1="23" y1="27" x2="24" y2="31" className="club-pet-leg-b" />
        </g>
      </svg>
    );
  }
  // pet-stickman and any unknown pet
  return (
    <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" className="text-foreground">
        <circle cx="12" cy="5" r="3.5" />
        <line x1="12" y1="9" x2="12" y2="20" />
        <line x1="12" y1="12" x2="6" y2="17" className="club-pet-leg-a" />
        <line x1="12" y1="12" x2="18" y2="17" className="club-pet-leg-b" />
        <line x1="12" y1="20" x2="7" y2="30" className="club-pet-leg-a" />
        <line x1="12" y1="20" x2="17" y2="30" className="club-pet-leg-b" />
      </g>
    </svg>
  );
}
