import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface TurkeyTarget {
  id: string;
  /** Position on the 1000 x 600 hunt field. */
  x: number;
  y: number;
}

/** Shape returned by the turkey_status() RPC. Times are epoch milliseconds from the server clock. */
export interface TurkeyStatus {
  now: number;
  active: boolean;
  end: number;
  next: number;
  balance: number;
  targets: TurkeyTarget[];
}

export function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Live turkey hunt state from turkey_status(). Re-checks every 15 seconds and when a
 * `luc1d-turkey` event fires (dispatched after an owner starts a manual hunt).
 * Pass `countdown: true` for a window that shows a ticking timer; otherwise the hook
 * re-renders only at the next start or end time.
 */
export function useTurkeyStatus({ countdown = false }: { countdown?: boolean } = {}) {
  const [status, setStatus] = useState<TurkeyStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const { data, error: failure } = await supabase.rpc("turkey_status");
    if (failure) {
      setError(failure.message);
      return;
    }
    const s = data as unknown as TurkeyStatus | null;
    if (!s) {
      // No status (for example demo mode): treat as no hunt running.
      setStatus(null);
      setError("");
      return;
    }
    setError("");
    setOffset(s.now - Date.now());
    setStatus(s);
  }, []);

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    window.addEventListener("luc1d-turkey", onChange);
    const poll = window.setInterval(() => void reload(), 15000);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("luc1d-turkey", onChange);
    };
  }, [reload]);

  useEffect(() => {
    if (countdown) {
      const ticker = window.setInterval(() => setClock(Date.now()), 1000);
      return () => window.clearInterval(ticker);
    }
    if (!status) return;
    const now = Date.now() + offset;
    const edge = status.active && status.end > now ? status.end : status.next;
    const timer = window.setTimeout(() => setClock(Date.now()), Math.max(0, edge - now) + 50);
    return () => window.clearTimeout(timer);
  }, [countdown, status, offset]);

  const now = clock + offset;
  const active = !!status && status.active && now < status.end;
  const target = status ? (active ? status.end : status.next) : now;
  const seconds = Math.max(0, Math.ceil((target - now) / 1000));

  return {
    status,
    error,
    active,
    balance: status?.balance ?? 0,
    countdown: formatCountdown(seconds),
    reload,
  };
}

/** True while a hunt is running. Use it to show or hide a sidebar entry. */
export function useTurkeyLive(): boolean {
  return useTurkeyStatus().active;
}
