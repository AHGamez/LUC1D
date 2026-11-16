import { useCallback, useEffect, useState } from "react";
import { Check, Lock, Ticket } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { money } from "../clubbird/club-items";
import { RingDecoration } from "../clubbird/RingDecoration";
import { PASS_MAX_LEVEL, PASS_PRICE_CENTS, PASS_REWARDS, XP_PER_LEVEL, passLevel, passRewardFor } from "./pass-rewards";
import { useXmasAccess } from "../xmas/xmasAccess";

type Pass = { xp: number; claimed: number[] };
const errMsg = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Something went wrong");
const REFRESH_MS = 30_000;

/** Text for what club_pass_claim() granted: a money amount in cents ("1500") or a ring id. */
const grantedText = (v: unknown, fallback: string) => {
  if (typeof v === "string" && /^\d+$/.test(v)) return money(Number(v));
  if (typeof v === "string") return PASS_REWARDS.find((r) => r.ring === v)?.label ?? v;
  return fallback;
};

export default function BattlePassApp({ session, shell }: AppProps) {
  const me = session.user?.id ?? null;
  const xmas = useXmasAccess();
  const [pass, setPass] = useState<Pass | null | undefined>(undefined);
  const [bal, setBal] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const [{ data: p }, { data: w }] = await Promise.all([
      supabase.from("club_pass").select("xp, claimed").eq("user_id", me).maybeSingle(),
      supabase.from("club_wallets").select("earned_cents, spent_cents").eq("user_id", me).maybeSingle(),
    ]);
    setPass(p ?? null);
    setBal(w ? w.earned_cents - w.spent_cents : 0);
  }, [me]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  // Price and reward amounts are enforced by club_buy_pass and club_pass_claim on the server.
  const buy = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("club_buy_pass");
    setBusy(false);
    if (error) shell.toast(errMsg(error), "error");
    else {
      shell.toast("Battle Pass unlocked!", "success");
      void load();
    }
  };

  // The database picks the reward (a ring, or money for viewers without Christmas access) and returns it.
  const claim = async (level: number) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("club_pass_claim", { _level: level });
    setBusy(false);
    if (error) shell.toast(errMsg(error), "error");
    else {
      shell.toast(`Level ${level} reward claimed: ${grantedText(data, "reward")}`, "success");
      void load();
    }
  };

  if (!me)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-pass,var(--primary))_16%,transparent)] text-[var(--app-pass,var(--primary))]">
          <Ticket className="size-7" aria-hidden="true" />
        </span>
        <p className="font-display text-base font-semibold tracking-tight">Battle Pass</p>
        <p className="text-sm text-muted-foreground">Sign in to see your Battle Pass.</p>
      </div>
    );
  if (pass === undefined)
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  const level = pass ? passLevel(pass.xp) : 0;
  const into = pass ? (level >= PASS_MAX_LEVEL ? XP_PER_LEVEL : pass.xp % XP_PER_LEVEL) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <header className="shell-glass relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[18px] border p-5">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklab,var(--app-pass,var(--primary))_18%,transparent)] text-[var(--app-pass,var(--primary))] ring-1 ring-[color-mix(in_oklab,var(--app-pass,var(--primary))_35%,transparent)] shadow-[0_10px_26px_-12px_color-mix(in_oklab,var(--app-pass,var(--primary))_80%,transparent)]">
              <Ticket className="size-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Season pass</p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Battle Pass</h2>
              <p className="text-sm text-muted-foreground">
                Your Discard money: <span className="font-semibold text-foreground">{money(bal)}</span>
              </p>
            </div>
          </div>
          {!pass && (
            <Button className="rounded-[12px] bg-[var(--app-pass,var(--primary))] text-primary-foreground shadow-[0_12px_28px_-10px_color-mix(in_oklab,var(--app-pass,var(--primary))_85%,transparent)] hover:brightness-110" disabled={busy || bal < PASS_PRICE_CENTS} onClick={buy}>
              Buy for {money(PASS_PRICE_CENTS)}
            </Button>
          )}
        </header>

        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <li className="shell-glass rounded-[14px] border p-3.5">⏱️ <b className="text-foreground">$10</b> every 10 minutes you&apos;re on LUC1D (pass only)</li>
          <li className="shell-glass rounded-[14px] border p-3.5">🎵 <b className="text-foreground">$2</b> per TikiTaki post (everyone)</li>
          <li className="shell-glass rounded-[14px] border p-3.5">⭐ Level up: 10 min online = 1 level, a post = ½ level</li>
        </ul>

        {!pass ? (
          <p className="rounded-[14px] border border-dashed border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
            {bal < PASS_PRICE_CENTS ? `You need ${money(PASS_PRICE_CENTS - bal)} more — every Discard message earns $0.10.` : "Buy the pass to start levelling up."}
          </p>
        ) : (
          <div className="shell-glass space-y-2 rounded-[18px] border p-4">
            <div className="flex justify-between text-sm">
              <span className="font-display font-semibold text-foreground">Level {level} / {PASS_MAX_LEVEL}</span>
              <span className="text-muted-foreground">{level >= PASS_MAX_LEVEL ? "Maxed!" : `${into} / ${XP_PER_LEVEL} XP`}</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={XP_PER_LEVEL}
              aria-valuenow={into}
              aria-label="XP to next level"
              className="h-2.5 overflow-hidden rounded-full bg-secondary ring-1 ring-border"
            >
              <div
                className="h-full rounded-full bg-[var(--app-pass,var(--primary))] shadow-[0_0_14px_color-mix(in_oklab,var(--app-pass,var(--primary))_80%,transparent)] transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${(into / XP_PER_LEVEL) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PASS_REWARDS.map((r0) => {
            const r = passRewardFor(r0, xmas);
            const reached = !!pass && level >= r.level;
            const claimed = !!pass?.claimed.includes(r.level);
            const ready = reached && !claimed;
            return (
              <div
                key={r.level}
                className={`shell-glass flex flex-col items-center gap-2 rounded-[18px] border p-3.5 text-center transition-[box-shadow,transform] duration-200 motion-safe:hover:-translate-y-0.5 ${ready ? "border-[var(--app-pass,var(--primary))] shadow-[0_0_0_1px_var(--app-pass,var(--primary)),0_16px_34px_-14px_color-mix(in_oklab,var(--app-pass,var(--primary))_85%,transparent)]" : claimed ? "opacity-80" : ""}`}
              >
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Level {r.level}</span>
                <div className={`relative grid size-14 place-items-center rounded-full bg-secondary text-lg ring-1 ${ready ? "ring-[var(--app-pass,var(--primary))]" : "ring-border"}`}>
                  {r.ring ? (
                    <>
                      <span aria-hidden="true">🐦</span>
                      <RingDecoration decoration={r.ring} />
                    </>
                  ) : (
                    <span aria-hidden="true">💰</span>
                  )}
                </div>
                <span className="font-display text-sm font-semibold text-foreground">{r.label}</span>
                {claimed ? (
                  <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"><Check className="size-3" />Claimed</span>
                ) : reached ? (
                  <Button size="sm" className="rounded-[10px] bg-[var(--app-pass,var(--primary))] text-primary-foreground" disabled={busy} onClick={() => claim(r.level)}>Claim</Button>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"><Lock className="size-3" aria-label="Locked" />Locked</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground">Rings you claim show up in Discard → profile → avatar decorations.</p>
      </div>
    </div>
  );
}
