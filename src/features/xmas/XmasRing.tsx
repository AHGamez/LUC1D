import "./xmas.css";

/** Christmas profile rings. Battle Pass levels 4 (Snowfall) and 7 (Candy Cane); owners and co-owners get them, others get money. */
export const XMAS_RING_IDS = ["ring-snowfall", "ring-candycane"] as const;
export type XmasRingId = (typeof XMAS_RING_IDS)[number];

export const isXmasRing = (id: string | undefined | null): id is XmasRingId =>
  !!id && (XMAS_RING_IDS as readonly string[]).includes(id);

/**
 * Snowy ring drawn around a round avatar. The parent must be `relative` and the avatar must be round.
 * Renders nothing for ids that are not Christmas rings, so callers can pass any decoration id.
 */
export function XmasRingDecoration({ decoration }: { decoration?: string | undefined }) {
  if (!isXmasRing(decoration)) return null;
  if (decoration === "ring-candycane") {
    return (
      <svg aria-hidden="true" viewBox="0 0 100 100" className="xmas-ring xmas-ring--ring-candycane" fill="none">
        <g className="xmas-ring-cane-orbit">
          <circle cx="50" cy="50" r="44" className="xmas-ring-cane-light" />
          <circle cx="50" cy="50" r="44" className="xmas-ring-cane-red" />
        </g>
        <g className="xmas-ring-sparkle">
          <circle cx="50" cy="6" r="3" className="xmas-ring-holly" />
          <circle cx="45" cy="4" r="2" className="xmas-ring-berry" />
          <circle cx="55" cy="4" r="2" className="xmas-ring-berry" />
        </g>
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="xmas-ring xmas-ring--ring-snowfall" fill="none">
      <defs>
        <clipPath id="xmas-ring-snow-clip">
          <circle cx="50" cy="50" r="38" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="44" className="xmas-ring-halo" />
      <circle cx="50" cy="50" r="44" strokeDasharray="6 5" className="xmas-ring-dots" />
      <g clipPath="url(#xmas-ring-snow-clip)">
        {Array.from({ length: 14 }, (_, i) => (
          <circle
            key={i}
            className="xmas-ring-flake"
            cx={14 + ((i * 37) % 72)}
            cy={0}
            r={1.2 + (i % 3) * 0.6}
            style={{ animationDelay: `${-((i * 0.37) % 3)}s`, animationDuration: `${2.4 + (i % 4) * 0.5}s` }}
          />
        ))}
      </g>
      <path d="M8 62 Q14 54 22 60 Q30 52 38 60" className="xmas-ring-cap" />
    </svg>
  );
}
