import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play } from "lucide-react";
import type { AppProps } from "@/apps/types";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { afkTime, AFK_HOUR_SECONDS } from "./lounge-afk";

/** How often the client pings the server while AFK. The server rejects gaps longer than 150 seconds. */
const PING_MS = 60_000;

type Action = "start" | "ping" | "stop";

interface TickResult {
  seconds: number;
  earned_cents: number;
  paid_cents: number;
  active: boolean;
}

const money = (cents: number) => `$${(Math.max(0, cents) / 100).toFixed(2)}`;

/** Reads the lounge_afk_tick JSON result. Anything unexpected (demo mode, a null answer) reads as no data. */
function readTick(data: unknown): TickResult | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  return {
    seconds: Number(d.seconds ?? 0),
    earned_cents: Number(d.earned_cents ?? 0),
    paid_cents: Number(d.paid_cents ?? 0),
    active: d.active === true,
  };
}

/**
 * AFK Lounge window. The server decides every second and every cent: lounge_afk_tick (migration 0075) counts
 * the time between pings and pays the hourly reward into the Discard wallet. This window only shows progress
 * and sends start, ping and stop. It never computes a payout.
 */
export default function LoungeApp({ session, shell }: AppProps) {
  const userId = session.user?.id ?? null;
  const [seconds, setSeconds] = useState(0);
  const [earned, setEarned] = useState(0);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionId = useRef<string | null>(null);
  const toastRef = useRef(shell.toast);

  useEffect(() => {
    toastRef.current = shell.toast;
  }, [shell.toast]);

  // Load the saved progress for this account. Row-level security lets a user read only their own row.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase
      .from("lounge_afk_sessions")
      .select("seconds,earned_cents")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) {
          setSeconds(Number(data.seconds ?? 0));
          setEarned(Number(data.earned_cents ?? 0));
        }
      });
    return () => {
      alive = false;
      // Leaving the window (or signing out) ends the session on the server, so no time is counted after that.
      const id = sessionId.current;
      sessionId.current = null;
      if (id) void supabase.rpc("lounge_afk_tick", { _session: id, _action: "stop" });
    };
  }, [userId]);

  const tick = useCallback(async (action: Action) => {
    const id = action === "start" ? crypto.randomUUID() : sessionId.current;
    if (!id) return;
    if (action === "start") sessionId.current = id;
    const { data, error: failure } = await supabase.rpc("lounge_afk_tick", { _session: id, _action: action });
    // A newer session replaced this one while the call was in flight: ignore the stale answer.
    if (sessionId.current !== id) return;
    if (failure) {
      setError(failure.message);
      setActive(false);
      sessionId.current = null;
      return;
    }
    const r = readTick(data);
    if (r) {
      setSeconds(r.seconds);
      setEarned(r.earned_cents);
      setActive(r.active);
      if (r.paid_cents > 0) toastRef.current(`AFK reward: ${money(r.paid_cents)} added to your Discard money`, "success");
    }
    if (action === "stop") sessionId.current = null;
  }, []);

  // While AFK, ping on an interval and right away when the connection comes back.
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void tick("ping"), PING_MS);
    const reconnect = () => {
      if (navigator.onLine) void tick("ping");
    };
    window.addEventListener("online", reconnect);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", reconnect);
    };
  }, [active, tick]);

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      await tick(active ? "stop" : "start");
    } finally {
      setBusy(false);
    }
  };

  const progress = Math.min(100, (seconds / AFK_HOUR_SECONDS) * 100);

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-body text-muted-foreground">Sign in to earn AFK rewards.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto p-4">
      <section
        aria-labelledby="lounge-title"
        className="shell-glass flex w-full max-w-md flex-col items-center gap-5 rounded-[var(--radius-card)] border p-7 text-center shadow-[var(--shadow-window)]"
      >
        <span aria-hidden className="grid size-16 place-items-center rounded-full bg-primary/15 text-primary shadow-[var(--surface-highlight)] ring-1 ring-primary/25 [&_svg]:size-7">
          <Coffee />
        </span>
        <div className="space-y-1">
          <h1 id="lounge-title" tabIndex={-1} className="text-display font-bold tracking-tight text-foreground focus:outline-none">
            AFK Lounge
          </h1>
          <p className="text-body text-muted-foreground">{money(1000)} every hour you stay connected</p>
        </div>
        <div role="timer" aria-label="Time until next reward" className="text-4xl font-semibold tabular-nums text-foreground">
          {afkTime(seconds)}
        </div>
        <div
          role="progressbar"
          aria-label="Hourly AFK progress"
          aria-valuenow={seconds}
          aria-valuemin={0}
          aria-valuemax={AFK_HOUR_SECONDS}
          className="h-2 w-full max-w-64 overflow-hidden rounded-full bg-muted shadow-[var(--surface-highlight)]"
        >
          <div className="h-full origin-left rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
        </div>
        <p role="status" className="text-caption text-muted-foreground">
          {active ? "Earning · Connected" : "Paused"} · Earned {money(earned)}
        </p>
        <Button variant={active ? "outline" : "default"} disabled={busy} onClick={() => void toggle()}>
          {active ? <Pause /> : <Play />}
          {active ? "Pause AFK" : "Start AFK"}
        </Button>
        <p className="text-caption text-muted-foreground">
          Keep this window open and connected. Each completed hour adds {money(1000)} to your Discard money. Offline time doesn’t count.
        </p>
        {error && <p role="alert" className="text-body text-destructive">{error}</p>}
      </section>
    </div>
  );
}
