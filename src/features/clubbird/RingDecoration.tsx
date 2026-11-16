import "./club.css";
import { XmasRingDecoration, isXmasRing } from "../xmas/XmasRing";

/** Paid profile rings sold in Club Bird and won from the Battle Pass. */
export const RING_IDS = [
  "ring-nebula",
  "ring-inferno",
  "ring-rainbow",
  "ring-royal",
  "ring-frost",
  "ring-toxic",
  "ring-legend",
] as const;

/**
 * Animated ring drawn around a round avatar. The parent must be `relative` and the
 * avatar must be round, the ring sits outside it. Renders nothing for unknown ids.
 */
export function RingDecoration({ decoration }: { decoration?: string | undefined }) {
  if (isXmasRing(decoration)) return <XmasRingDecoration decoration={decoration} />;
  if (!decoration || !(RING_IDS as readonly string[]).includes(decoration)) return null;
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className={`club-ring club-ring--${decoration}`} fill="none">
      <g className="club-ring-orbit">
        <circle cx="50" cy="50" r="44" className="club-ring-halo" />
        <circle cx="50" cy="50" r="44" strokeDasharray="44 30 18 70 30 85" className="club-ring-trail" />
        <ellipse cx="50" cy="50" rx="49" ry="38" transform="rotate(-28 50 50)" strokeDasharray="60 90 45 90" className="club-ring-secondary" />
      </g>
      <g className="club-ring-sparkles">
        <path d="M16 12 18 19 25 21 18 23 16 30 14 23 7 21 14 19Z" />
        <path d="M84 64 86 72 94 74 86 76 84 84 82 76 74 74 82 72Z" />
        <path d="M62 2 63 6 67 7 63 8 62 12 61 8 57 7 61 6Z" />
        <circle cx="28" cy="91" r="2" /><circle cx="93" cy="31" r="1.8" />
      </g>
    </svg>
  );
}
