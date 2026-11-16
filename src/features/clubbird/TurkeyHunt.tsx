import { useCallback, useEffect, useState } from "react";
import { Crosshair, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { AvatarDecoration } from "../discard/AvatarDecoration";
import { PetSprite } from "./BirdArt";
import { TURKEY_SHOP, turkeyMoney } from "./fall-event";

type Target = { id: string; x: number; y: number };
type Status = { now: number; active: boolean; end: number; next: number; balance: number; targets: Target[] };

/**
 * Turkey hunts: every two hours a 10-minute window opens in Club Bird where you click turkeys for
 * Turkey Coins. Every reward, price and ownership check happens in the turkey_* database functions.
 * The browser only shows the result and never sends an amount.
 */
export function useTurkeyHunt(onChanged: () => void) {
  const [status, setStatus] = useState<Status | null>(null);
  const [shop, setShop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [shot, setShot] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("turkey_status");
    if (error) {
      setNote(error.message);
      return;
    }
    const s = data as unknown as Status;
    setStatus(s);
    // Use the server clock so the countdown agrees with the hunt window even if this device is wrong.
    setOffset(s.now - Date.now());
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: items } = await supabase
        .from("club_owned")
        .select("item_id")
        .eq("user_id", auth.user.id)
        .in("item_id", TURKEY_SHOP.map((i) => i.id));
      setOwned((items ?? []).map((i) => i.item_id));
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("luc1d-turkey", load);
    const poll = window.setInterval(load, 15000);
    const tick = window.setInterval(() => setClock(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener("luc1d-turkey", load);
    };
  }, [load]);

  useEffect(() => {
    if (!shot) return;
    const t = setTimeout(() => setShot(false), 180);
    return () => clearTimeout(t);
  }, [shot]);

  const active = !!status?.active && clock + offset < status.end;
  const seconds = Math.max(0, Math.ceil(((active ? status?.end : status?.next) ?? clock) - clock - offset) / 1000);
  const countdown = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  const hit = async (id: string) => {
    if (busy || !active) return;
    setBusy(true);
    setShot(true);
    const { data, error } = await supabase.rpc("turkey_hit", { _target: id });
    setNote(error ? error.message : `+${turkeyMoney(data ?? 0)}`);
    await load();
    setBusy(false);
  };

  const buy = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("turkey_buy", { _item: id });
    setNote(error ? error.message : "Reward unlocked!");
    if (!error) {
      onChanged();
      window.dispatchEvent(new Event("luc1d-pets"));
    }
    await load();
    setBusy(false);
  };

  const equip = async (id: string) => {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      return;
    }
    // The club_check_ring trigger rejects rings the user does not own.
    const { error } = await supabase.from("discard_profiles").update({ avatar_decoration: id }).eq("user_id", auth.user.id);
    setNote(error ? error.message : "Ring equipped!");
    setBusy(false);
  };

  const toolbar = (
    <div className="shell-glass m-2 flex flex-wrap items-center gap-2 rounded-[14px] border px-3 py-2 text-xs">
      <Crosshair className="size-4 shrink-0 text-[var(--app-club,var(--primary))]" aria-hidden="true" />
      <span className="font-semibold">{active ? "Turkey hunt LIVE" : "Next turkey hunt"}</span>
      <span className="tabular-nums text-muted-foreground">{status ? countdown : "Loading…"}</span>
      <span className="ml-auto font-mono">{turkeyMoney(status?.balance ?? 0)}</span>
      <Button size="sm" variant="outline" onClick={() => { setShop(true); setNote(""); }}>
        Turkey shop
      </Button>
    </div>
  );

  // Turkeys are SVG groups. Each is a real button for mouse, touch and keyboard.
  const targets = active
    ? status?.targets.map((t) => (
        <g
          key={t.id}
          transform={`translate(${t.x} ${t.y})`}
          className="turkey-target"
          role="button"
          aria-label="Hunt turkey"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            void hit(t.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void hit(t.id);
            }
          }}
        >
          <rect x="-30" y="-35" width="60" height="60" fill="transparent" />
          <foreignObject x="-25" y="-30" width="50" height="40">
            <PetSprite kind="pet-turkey" />
          </foreignObject>
        </g>
      ))
    : null;

  const shotgun = active ? (
    <g transform="translate(12 -4)">
      <path d="M0 0 H40 V6 H13 L8 14 H2 L6 6 H0Z" fill="var(--muted-foreground)" stroke="var(--foreground)" strokeWidth="1" />
      <path d="M0 3 H12 L6 12 H0Z" fill="var(--fall-feather)" />
      {shot && <path d="M42 2 L54 -5 L50 2 L59 4 L50 6 L53 12 L42 6Z" fill="var(--fall-leaf-alt)" />}
    </g>
  ) : null;

  const feedback =
    note && !shop ? (
      <p role="status" className="shell-glass pointer-events-none absolute bottom-3 right-3 rounded-[12px] border px-3 py-2 text-xs text-card-foreground">
        {note}
      </p>
    ) : null;

  const modal = shop ? (
    <div className="absolute inset-0 z-20 grid place-items-center bg-background/80 p-3 backdrop-blur-sm">
      <section className="shell-glass w-full max-w-lg rounded-[18px] border p-5">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight">Turkey shop</h2>
          <Button variant="ghost" size="icon" aria-label="Close turkey shop" onClick={() => setShop(false)}>
            <X />
          </Button>
        </header>
        <p className="mb-4 font-mono text-[var(--app-club,var(--primary))]">{turkeyMoney(status?.balance ?? 0)}</p>
        <div className="grid grid-cols-3 gap-2">
          {TURKEY_SHOP.map((i) => (
            <div key={i.id} className="flex min-w-0 flex-col items-center gap-3 text-center">
              <div className="relative size-14">
                {i.kind === "pet" ? (
                  <PetSprite kind={i.id} />
                ) : (
                  <>
                    <div className="size-14 rounded-full bg-secondary" />
                    <AvatarDecoration decoration={i.id} />
                  </>
                )}
              </div>
              <span className="text-xs font-semibold">{i.name}</span>
              <span className="text-xs">{turkeyMoney(i.cents)}</span>
              {owned.includes(i.id) ? (
                i.kind === "ring" ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => equip(i.id)}>
                    Equip
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Owned</span>
                )
              ) : (
                <Button size="sm" disabled={busy || !status || (status.balance ?? 0) < i.cents} onClick={() => buy(i.id)}>
                  Buy
                </Button>
              )}
            </div>
          ))}
        </div>
        <p role="status" className="mt-4 text-xs text-muted-foreground">
          {note || "Turkey Coins · every 2 hours · 10-minute hunt"}
        </p>
      </section>
    </div>
  ) : null;

  return { toolbar, targets, shotgun, feedback, modal };
}
