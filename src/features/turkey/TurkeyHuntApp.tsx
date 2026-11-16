import { useCallback, useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import type { AppProps } from "@/apps/types";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { TURKEY_SHOP, turkeyMoney } from "@/lib/fall-event";
import { FallLeaves, ShimejiSprite, ShimejiStyles } from "@/shell/extras/Shimeji";
import { AvatarDecoration } from "@/features/discard/AvatarDecoration";
import { useTurkeyStatus } from "./useTurkeyStatus";

type View = "hunt" | "shop";

/** Fall-colour field the turkeys run across. Decorative only. */
const FIELD_BG =
  "radial-gradient(ellipse at 20% 15%, oklch(0.55 0.15 55 / .45), transparent 60%), linear-gradient(180deg, oklch(0.2 0.05 40), oklch(0.32 0.09 45) 65%, oklch(0.42 0.11 60))";

/**
 * Turkey Hunt window: a ten-minute hunt every two hours, plus the fall shop.
 * Rewards and balances change only through the turkey_* RPCs. The client never moves money.
 */
export default function TurkeyHuntApp({ session }: AppProps) {
  const userId = session.user?.id ?? null;
  const { status, error, active, balance, countdown, reload } = useTurkeyStatus({ countdown: true });
  const [view, setView] = useState<View>("hunt");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [owned, setOwned] = useState<string[]>([]);

  const loadOwned = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("club_owned")
      .select("item_id")
      .eq("user_id", userId)
      .in("item_id", TURKEY_SHOP.map((i) => i.id));
    setOwned((data ?? []).map((r) => r.item_id));
  }, [userId]);

  useEffect(() => {
    void loadOwned();
  }, [loadOwned]);

  const hit = async (id: string) => {
    if (busy || !active) return;
    setBusy(true);
    const { data, error: failure } = await supabase.rpc("turkey_hit", { _target: id });
    setNote(failure ? failure.message : `+${turkeyMoney(typeof data === "number" ? data : 0)}`);
    await reload();
    setBusy(false);
  };

  const buy = async (id: string, isPet: boolean) => {
    if (busy) return;
    setBusy(true);
    const { error: failure } = await supabase.rpc("turkey_buy", { _item: id });
    setNote(failure ? failure.message : "Reward unlocked!");
    if (!failure && isPet) window.dispatchEvent(new Event("luc1d-pets"));
    await Promise.all([reload(), loadOwned()]);
    setBusy(false);
  };

  const equip = async (id: string) => {
    if (busy || !userId) return;
    setBusy(true);
    const { error: failure } = await supabase.from("discard_profiles").update({ avatar_decoration: id }).eq("user_id", userId);
    setNote(failure ? failure.message : "Ring equipped!");
    setBusy(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <ShimejiStyles />
      <header className="shell-glass flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_oklab,var(--app-turkey,var(--primary))_18%,transparent)] text-[var(--app-turkey,var(--primary))]">
            <Crosshair className="size-4" aria-hidden />
          </span>
          <h2 className="font-display text-title font-semibold">Turkey Hunt</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-caption font-medium",
              active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground",
            )}
          >
            {active ? "Live" : "Next hunt"}
          </span>
        </div>
        <span className="text-body tabular-nums text-muted-foreground">
          {status ? `${active ? "Ends in" : "Starts in"} ${countdown}` : "Loading…"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-body" aria-label="Turkey Coins balance">{turkeyMoney(balance)}</span>
          <div role="tablist" aria-label="Turkey hunt sections" className="flex rounded-[12px] border border-border bg-secondary/60 p-0.5">
            {(["hunt", "shop"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => { setView(v); setNote(""); }}
                className={cn(
                  "rounded-[9px] px-3 py-1 text-caption font-medium transition-colors",
                  view === v ? "bg-card text-foreground shadow-sm ring-1 ring-[color-mix(in_oklab,var(--app-turkey,var(--primary))_45%,transparent)]" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {v === "hunt" ? "Hunt" : "Fall shop"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <p role="alert" className="px-4 pt-3 text-body text-destructive">{error}</p>}

      {view === "hunt" ? (
        <div className="relative min-h-[300px] flex-1 overflow-hidden" style={{ background: FIELD_BG }}>
          <FallLeaves count={16} />
          {active && status ? (
            status.targets.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label="Hunt turkey"
                disabled={busy}
                onClick={() => void hit(t.id)}
                style={{ left: `${(t.x / 1000) * 100}%`, top: `${(t.y / 600) * 100}%` }}
                className="absolute size-14 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full transition-transform duration-150 motion-safe:hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-wait"
              >
                <ShimejiSprite kind="pet-turkey" />
              </button>
            ))
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="shell-glass space-y-2 rounded-[18px] border px-6 py-5 text-center">
                <p className="font-display text-title font-semibold">{status ? "No hunt right now" : "Loading the field…"}</p>
                {status && <p className="text-body text-muted-foreground">The next hunt starts in {countdown}. Hunts last ten minutes.</p>}
              </div>
            </div>
          )}
          <p role="status" className="shell-glass absolute bottom-3 left-3 rounded-[12px] border px-3 py-2 text-body empty:hidden">{note}</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-4 text-body text-muted-foreground">Turkey Coins come from hunts. They only buy fall rewards.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {TURKEY_SHOP.map((item) => {
              const has = owned.includes(item.id);
              return (
                <article key={item.id} className="shell-glass flex flex-col items-center gap-3 rounded-[18px] border p-4 text-center transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_color-mix(in_oklab,var(--app-turkey,var(--primary))_70%,transparent)]">
                  <div className="relative size-16">
                    {item.kind === "pet" ? (
                      <ShimejiSprite kind={item.id} />
                    ) : (
                      <>
                        <div className="size-16 rounded-full bg-secondary" />
                        <AvatarDecoration decoration={item.id} />
                      </>
                    )}
                  </div>
                  <h3 className="font-display font-semibold tracking-tight">{item.name}</h3>
                  <p className="rounded-full bg-[color-mix(in_oklab,var(--app-turkey,var(--primary))_14%,transparent)] px-2.5 py-0.5 font-mono text-body text-[var(--app-turkey,var(--primary))]">{turkeyMoney(item.cents)}</p>
                  {has ? (
                    item.kind === "ring" ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void equip(item.id)}>Equip</Button>
                    ) : (
                      <span className="text-caption text-muted-foreground">Owned</span>
                    )
                  ) : (
                    <Button size="sm" disabled={busy || balance < item.cents} onClick={() => void buy(item.id, item.kind === "pet")}>
                      Buy
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
          <p role="status" className="mt-4 text-caption text-muted-foreground empty:hidden">{note}</p>
        </div>
      )}
    </div>
  );
}
