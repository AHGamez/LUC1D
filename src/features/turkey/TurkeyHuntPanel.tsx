import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useTurkeyStatus } from "./useTurkeyStatus";

/**
 * Inline Home banner. Renders nothing unless a hunt is live. Clicking it calls onOpen,
 * which the Home screen should wire to shell.openApp("turkey").
 */
export function TurkeyHuntPanel({ onOpen }: { onOpen: () => void }) {
  const { active, countdown } = useTurkeyStatus({ countdown: true });
  if (!active) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="shell-glass flex w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition-transform duration-150 motion-safe:hover:-translate-y-px"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklab,var(--app-turkey,var(--primary))_18%,transparent)] text-[var(--app-turkey,var(--primary))]">
        <Crosshair className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Turkey hunt is live</span>
        <span className="block text-caption text-muted-foreground">Catch turkeys for Turkey Coins. Ends in {countdown}.</span>
      </span>
      <span className="shrink-0 rounded-full bg-[var(--app-turkey,var(--primary))] px-3 py-1 text-body font-medium text-primary-foreground">Join</span>
    </button>
  );
}

/**
 * Owner-only control to start a manual hunt. The database checks the caller and
 * returns the end time; the component renders nothing for everyone else.
 */
export function TurkeyActivateButton() {
  const [canActivate, setCanActivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    void supabase.rpc("turkey_can_activate").then(({ data, error }) => {
      if (alive) setCanActivate(!error && data === true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!canActivate) return null;

  const activate = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("turkey_activate");
    setMessage(error ? error.message : `Turkey hunt is live for everyone until ${new Date(data ?? "").toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    if (!error) window.dispatchEvent(new Event("luc1d-turkey"));
    setBusy(false);
  };

  return (
    <div className="space-y-2">
      <Button size="sm" disabled={busy} onClick={() => void activate()}>
        {busy ? "Starting…" : "Start turkey hunt"}
      </Button>
      {message && <p role="status" className="text-caption text-muted-foreground">{message}</p>}
    </div>
  );
}
