import { useEffect, useState } from "react";

/**
 * Formatted local time, refreshed every 10 seconds. It lives in its own component
 * so the rest of the desktop does not re-render on every tick.
 */
export function useClock(clock24: boolean) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !clock24 }));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [clock24]);
  return time;
}
