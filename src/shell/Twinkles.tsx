import { useEffect, useState } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

/** Random twinkling stars plus a few shooting stars. Positions are picked once per mount. */
export function Twinkles({ count, shooting }: { count: number; shooting: boolean }) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 4 + 2,
        delay: Math.random() * 5,
      })),
    );
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="lucid-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {shooting &&
        [0, 1, 2].map((i) => (
          <span
            key={`shoot-${i}`}
            className="lucid-shooting"
            style={{
              left: `${60 + i * 15}%`,
              top: `${5 + i * 12}%`,
              animationDuration: `${9 + i * 4}s`,
              animationDelay: `${i * 3.5}s`,
            }}
          />
        ))}
    </div>
  );
}
