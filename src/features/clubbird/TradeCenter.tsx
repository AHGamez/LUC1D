import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { CLUB_ITEMS, money } from "./club-items";
import { Overlay } from "./ClubPanels";

type Trade = {
  id: string;
  from_user: string;
  to_user: string;
  give_items: string[];
  give_cents: number;
  want_items: string[];
  want_cents: number;
  status: string;
  created_at: string;
};
type Person = { user_id: string; display_name: string };

const itemName = (id: string) =>
  CLUB_ITEMS.find((i) => i.id === id)?.name ?? id.replace(/^(ring|hat|color|house)-/, "").replace(/^./, (c) => c.toUpperCase()) + (id.startsWith("ring-") ? " ring" : "");
/** Money typed by the user, converted to whole cents. The database re-checks the balance. */
const toCents = (v: string) => Math.max(0, Math.round((parseFloat(v) || 0) * 100));
const toggleIn = (s: Set<string>, id: string) => {
  const n = new Set(s);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  return n;
};

export function TradeCenter({ me, onClose, onChanged }: { me: string; onClose: () => void; onChanged: () => void }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mineOwned, setMineOwned] = useState<string[]>([]);
  const [theirOwned, setTheirOwned] = useState<string[]>([]);
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [give, setGive] = useState<Set<string>>(new Set());
  const [want, setWant] = useState<Set<string>>(new Set());
  const [giveMoney, setGiveMoney] = useState("");
  const [wantMoney, setWantMoney] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [p, t, o] = await Promise.all([
      supabase.from("discard_profiles").select("user_id, display_name"),
      supabase.from("club_trades").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("club_owned").select("item_id").eq("user_id", me),
    ]);
    setPeople((p.data ?? []).filter((x) => x.user_id !== me));
    setTrades((t.data ?? []) as Trade[]);
    setMineOwned((o.data ?? []).map((r) => r.item_id));
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setWant(new Set());
    if (!to) {
      setTheirOwned([]);
      return;
    }
    let alive = true;
    supabase
      .from("club_owned")
      .select("item_id")
      .eq("user_id", to)
      .then(({ data }) => {
        if (alive) setTheirOwned((data ?? []).map((r) => r.item_id));
      });
    return () => {
      alive = false;
    };
  }, [to]);

  const nameOf = (id: string) => people.find((p) => p.user_id === id)?.display_name ?? "someone";
  const matches = useMemo(
    () => people.filter((p) => p.display_name.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    [people, query],
  );

  const send = async () => {
    const { error } = await supabase.rpc("club_trade_offer", {
      _to: to,
      _give_items: [...give],
      _give_cents: toCents(giveMoney),
      _want_items: [...want],
      _want_cents: toCents(wantMoney),
    });
    if (error) return setNote(error.message);
    setNote(`Offer sent to ${nameOf(to)}!`);
    setGive(new Set());
    setWant(new Set());
    setGiveMoney("");
    setWantMoney("");
    void load();
  };

  const respond = async (id: string, action: "accept" | "decline" | "cancel") => {
    const { error } = await supabase.rpc("club_trade_respond", { _id: id, _action: action });
    setNote(error ? error.message : action === "accept" ? "Trade done!" : action === "decline" ? "Declined." : "Offer canceled.");
    void load();
    onChanged();
  };

  const side = (ids: string[], cents: number) =>
    [...ids.map(itemName), ...(cents ? [money(cents)] : [])].join(", ") || "nothing";

  const Chips = ({ ids, sel, onToggle, empty }: { ids: string[]; sel: Set<string>; onToggle: (id: string) => void; empty: string }) => (
    <div className="flex flex-wrap gap-1">
      {ids.length === 0 ? (
        <span className="text-xs text-muted-foreground">{empty}</span>
      ) : (
        ids.map((id) => (
          <button
            key={id}
            onClick={() => onToggle(id)}
            aria-pressed={sel.has(id)}
            className={`rounded-md px-2 py-0.5 text-xs transition-colors ${sel.has(id) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            {itemName(id)}
          </button>
        ))
      )}
    </div>
  );

  const moneyInput = (label: string, value: string, set: (v: string) => void) => (
    <input
      value={value}
      onChange={(e) => set(e.target.value)}
      inputMode="decimal"
      placeholder="+ money $"
      aria-label={label}
      className="mt-1 w-28 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
    />
  );

  return (
    <Overlay onClose={onClose} label="Trading">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <ArrowLeftRight className="size-5 text-[var(--app-club,var(--primary))]" />
        <h2 className="font-display font-bold tracking-tight text-foreground">Trading</h2>
        <span className="text-xs text-muted-foreground">rings, cosmetics &amp; money</span>
        <button aria-label="Close trading" onClick={onClose} className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Open trades</h3>
          {trades.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open trades.</p>
          ) : (
            trades.map((t) => {
              const incoming = t.to_user === me;
              return (
                <div key={t.id} className="rounded-[14px] border border-border bg-background/40 p-3 text-xs">
                  <p className="font-semibold text-foreground">{incoming ? `${nameOf(t.from_user)} wants to trade` : `Your offer to ${nameOf(t.to_user)}`}</p>
                  <p className="text-muted-foreground">You get: {side(incoming ? t.give_items : t.want_items, incoming ? t.give_cents : t.want_cents)}</p>
                  <p className="text-muted-foreground">You give: {side(incoming ? t.want_items : t.give_items, incoming ? t.want_cents : t.give_cents)}</p>
                  <div className="mt-2 flex gap-2">
                    {incoming ? (
                      <>
                        <Button size="sm" onClick={() => respond(t.id, "accept")}>Accept</Button>
                        <Button size="sm" variant="secondary" onClick={() => respond(t.id, "decline")}>Decline</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => respond(t.id, "cancel")}>Cancel</Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">New trade</h3>
          {to ? (
            <p className="text-xs text-foreground">
              Trading with <b>{nameOf(to)}</b>{" "}
              <button onClick={() => setTo("")} className="text-muted-foreground underline hover:text-foreground">change</button>
            </p>
          ) : (
            <div className="space-y-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a person…"
                aria-label="Search a person"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              {query && (
                <div className="flex flex-wrap gap-1">
                  {matches.map((p) => (
                    <button key={p.user_id} onClick={() => setTo(p.user_id)} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:bg-accent">
                      {p.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {to && (
            <>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">You give</p>
                <Chips ids={mineOwned} sel={give} onToggle={(id) => setGive((s) => toggleIn(s, id))} empty="You don't own any items yet." />
                {moneyInput("Money you give", giveMoney, setGiveMoney)}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">You want</p>
                <Chips ids={theirOwned} sel={want} onToggle={(id) => setWant((s) => toggleIn(s, id))} empty="They don't own any items." />
                {moneyInput("Money you want", wantMoney, setWantMoney)}
              </div>
              <Button onClick={send}>Send offer</Button>
            </>
          )}
        </section>
      </div>
      {note && <p role="status" className="border-t border-border px-4 py-2 text-xs text-foreground">{note}</p>}
    </Overlay>
  );
}
