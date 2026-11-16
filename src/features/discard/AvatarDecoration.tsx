import "./AvatarDecoration.css";

/** Decoration ids saved on the user's profile. `paid` rings are bought in Club Bird and enforced by the database. */
export const AVATAR_DECORATIONS: { id: string; name: string; paid?: boolean }[] = [
  { id: "none", name: "None" },
  { id: "galaxy", name: "Galaxy" },
  { id: "aurora", name: "Aurora" },
  { id: "stardust", name: "Stardust" },
  { id: "ring-nebula", name: "Nebula", paid: true },
  { id: "ring-inferno", name: "Inferno", paid: true },
  { id: "ring-rainbow", name: "Rainbow", paid: true },
  { id: "ring-royal", name: "Royal", paid: true },
  { id: "ring-frost", name: "Frost", paid: true },
  { id: "ring-toxic", name: "Toxic", paid: true },
  { id: "ring-legend", name: "Legend", paid: true },
  { id: "ring-leaves", name: "Leaves", paid: true },
  { id: "ring-gobbler", name: "Gobbler", paid: true },
];

/**
 * Animated SVG ring drawn over a profile picture. Place it inside a `position: relative` element
 * that sizes the avatar. Renders nothing for "none" or unknown ids. Motion stops under reduced motion.
 */
export function AvatarDecoration({ decoration }: { decoration?: string | null | undefined }) {
  if (!decoration || decoration === "none" || !AVATAR_DECORATIONS.some((d) => d.id === decoration)) return null;
  if (decoration === "ring-leaves" || decoration === "ring-gobbler") {
    // Fall rings: a wreath of leaves, plus a gobbler head for the Gobbler ring. Static, so no motion to stop.
    return (
      <svg aria-hidden="true" viewBox="0 0 100 100" className="discard-decoration discard-decoration--fall" fill="none">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} className="fall-ring-leaf" transform={`rotate(${i * 30} 50 50)`} d="M50 2 Q35 6 43 19 Q56 16 50 2Z" />
        ))}
        {decoration === "ring-gobbler" && (
          <g>
            <path className="fall-turkey-head" d="M28 12 Q24 -7 40 -5 Q46 -19 55 -5 Q72 -10 72 12Z" />
            <ellipse className="fall-turkey-head" cx="50" cy="7" rx="16" ry="13" />
            <circle cx="44" cy="4" r="2" fill="oklch(0.2 0.02 60)" />
            <circle cx="56" cy="4" r="2" fill="oklch(0.2 0.02 60)" />
            <path d="M46 9 L54 9 L50 15Z" fill="oklch(0.78 0.14 85)" />
            <path d="M53 13 Q60 21 53 24" stroke="oklch(0.6 0.2 25)" strokeWidth="4" fill="none" />
          </g>
        )}
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className={`discard-decoration discard-decoration--${decoration}`} fill="none">
      <g className="discard-decoration-orbit">
        <circle cx="50" cy="50" r="44" className="discard-decoration-halo" />
        <circle cx="50" cy="50" r="44" strokeDasharray="44 30 18 70 30 85" className="discard-decoration-trail" />
        <ellipse cx="50" cy="50" rx="49" ry="38" transform="rotate(-28 50 50)" strokeDasharray="60 90 45 90" className="discard-decoration-secondary" />
      </g>
      <g className="discard-decoration-sparkles">
        <path d="M16 12 18 19 25 21 18 23 16 30 14 23 7 21 14 19Z" />
        <path d="M84 64 86 72 94 74 86 76 84 84 82 76 74 74 82 72Z" />
        <path d="M62 2 63 6 67 7 63 8 62 12 61 8 57 7 61 6Z" />
        <circle cx="28" cy="91" r="2" />
        <circle cx="93" cy="31" r="1.8" />
      </g>
    </svg>
  );
}
