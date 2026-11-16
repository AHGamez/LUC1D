import { useEffect, useState } from "react";

/** The scheduled LUC1D revamp release: midnight on Dec 1, 2026, in the viewer's local time. Change it here only. */
export const REVAMP_RELEASE_AT = new Date(2026, 11, 1, 0, 0, 0, 0).getTime();

/** Counts down to REVAMP_RELEASE_AT. Renders nothing once the release has passed or before the first tick. */
export function ComingCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (now === null || now >= REVAMP_RELEASE_AT) return null;

  const total = Math.floor((REVAMP_RELEASE_AT - now) / 1000);
  const parts: [number, string][] = [
    [Math.floor(total / 86400), "days"],
    [Math.floor(total / 3600) % 24, "hours"],
    [Math.floor(total / 60) % 60, "minutes"],
    [total % 60, "seconds"],
  ];

  return (
    <div className="mt-4 text-center" role="timer" aria-label="Time until the LUC1D revamp">
      <div className="section-label text-primary">LUC1D revamp</div>
      <div className="mt-2 flex justify-center gap-2">
        {parts.map(([value, label]) => (
          <div
            key={label}
            className="surface-control min-w-16 px-3 py-1.5 backdrop-blur"
          >
            <div className="font-display text-2xl font-bold tabular-nums text-foreground">{String(value).padStart(2, "0")}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
