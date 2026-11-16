import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowLeftRight, ShoppingBag, Send, Trophy } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { CLUB_ITEMS, bestHouse, money, rankByMoney, type BoardRow, type ClubKind } from "./club-items";
import { Bird, HouseRoom, Plaza, W, H, type Look, type Pos } from "./BirdArt";
import { BalTop, Shop } from "./ClubPanels";
import { TradeCenter } from "./TradeCenter";
import { useTurkeyHunt } from "./TurkeyHunt";
import "./club.css";

const SPEED = 260;
const SHOP_DOOR = { x: 170, y: 250 };
const HOME_DOOR = { x: 840, y: 250 };
const EXIT_DOOR = { x: 500, y: 560 };
const MOVE_KEYS = ["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"];

type WorldPos = Pos & { id: string; restyle?: boolean };

const near = (a: { x: number; y: number }, b: { x: number; y: number }, r = 60) => Math.hypot(a.x - b.x, a.y - b.y) < r;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function ClubBirdApp({ session }: AppProps) {
  const me = session.user?.id ?? null;
  if (!me) return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-club,var(--primary))_16%,transparent)] text-[var(--app-club,var(--primary))]">
          <Trophy className="size-7" aria-hidden="true" />
        </span>
        <p className="font-display text-base font-semibold tracking-tight">Club Bird</p>
        <p className="text-sm text-muted-foreground">Sign in to visit Club Bird.</p>
      </div>
  );
  return <ClubBird me={me} />;
}

function ClubBird({ me }: { me: string }) {
  const [room, setRoom] = useState<"plaza" | "house">("plaza");
  const [wallet, setWallet] = useState({ earned: 0, spent: 0, messages: 0 });
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [looks, setLooks] = useState<Record<string, Look>>({});
  const [others, setOthers] = useState<Record<string, Pos>>({});
  const [mine, setMine] = useState<Pos>({ x: 500, y: 420, face: 1 });
  const [shop, setShop] = useState(false);
  const [board, setBoard] = useState(false);
  const [trade, setTrade] = useState(false);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [note, setNote] = useState("");
  const [chat, setChat] = useState("");

  const pos = useRef<Pos>(mine);
  const target = useRef<{ x: number; y: number } | null>(null);
  const keys = useRef(new Set<string>());
  const svg = useRef<SVGSVGElement>(null);
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lookLoaded = useRef(new Set<string>());

  const loadMine = useCallback(async () => {
    const [w, o] = await Promise.all([
      supabase.from("club_wallets").select("earned_cents, spent_cents, messages").eq("user_id", me).maybeSingle(),
      supabase.from("club_owned").select("item_id").eq("user_id", me),
    ]);
    setWallet({ earned: w.data?.earned_cents ?? 0, spent: w.data?.spent_cents ?? 0, messages: w.data?.messages ?? 0 });
    setOwned(new Set((o.data ?? []).map((r) => r.item_id)));
  }, [me]);

  const loadBoard = useCallback(async () => {
    const [w, p, b] = await Promise.all([
      supabase.from("club_wallets").select("user_id, earned_cents, spent_cents, messages"),
      supabase.from("discard_profiles").select("user_id, display_name"),
      supabase.from("club_birds").select("user_id, color, hat"),
    ]);
    setRows(
      rankByMoney(
        (w.data ?? []).map((r) => {
          const bird = b.data?.find((x) => x.user_id === r.user_id);
          return {
            userId: r.user_id,
            cents: r.earned_cents - r.spent_cents,
            messages: r.messages,
            name: p.data?.find((x) => x.user_id === r.user_id)?.display_name ?? "bird",
            color: bird?.color ?? "default",
            hat: bird?.hat ?? "none",
          };
        }),
      ),
    );
  }, []);

  const openBoard = () => {
    setBoard(true);
    void loadBoard();
  };

  const loadLooks = useCallback(async (ids: string[], force = false) => {
    const need = ids.filter((id) => force || !lookLoaded.current.has(id));
    if (!need.length) return;
    need.forEach((id) => lookLoaded.current.add(id));
    const [b, p] = await Promise.all([
      supabase.from("club_birds").select("user_id, color, hat, tag").in("user_id", need),
      supabase.from("discard_profiles").select("user_id, display_name").in("user_id", need),
    ]);
    setLooks((prev) => {
      const next = { ...prev };
      for (const id of need) {
        const bird = b.data?.find((r) => r.user_id === id);
        next[id] = {
          color: bird?.color ?? "default",
          hat: bird?.hat ?? "none",
          tag: bird?.tag ?? "none",
          name: p.data?.find((r) => r.user_id === id)?.display_name ?? "bird",
        };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void loadMine();
    void loadLooks([me]);
  }, [loadMine, loadLooks, me]);

  // Keep bird name labels current when anyone renames their profile.
  useEffect(() => {
    const refresh = () => loadLooks([...lookLoaded.current], true);
    const sub = supabase.channel("club-bird-names").on("postgres_changes", { event: "UPDATE", schema: "public", table: "discard_profiles" }, refresh).subscribe();
    const timer = setInterval(refresh, 60 * 1000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(sub);
    };
  }, [loadLooks]);

  // Realtime: the plaza is shared; your house is your own room.
  useEffect(() => {
    const name = room === "plaza" ? "club-bird-plaza" : `club-bird-house-${me}`;
    const c = supabase.channel(name, { config: { presence: { key: me }, broadcast: { self: false } } });
    c.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as WorldPos;
      if (p.id === me) return;
      setOthers((o) => ({ ...o, [p.id]: { ...o[p.id], ...p } }));
      void loadLooks([p.id], !!p.restyle);
    });
    c.on("presence", { event: "leave" }, ({ key }) =>
      setOthers((o) => {
        const n = { ...o };
        delete n[key];
        return n;
      }),
    );
    c.on("presence", { event: "sync" }, () => {
      const ids = Object.keys(c.presenceState()).filter((k) => k !== me);
      void loadLooks(ids);
      setOthers((o) => Object.fromEntries(Object.entries(o).filter(([k]) => ids.includes(k))));
    });
    c.subscribe((s) => {
      if (s === "SUBSCRIBED") {
        void c.track({ at: Date.now() });
        void c.send({ type: "broadcast", event: "pos", payload: { id: me, ...pos.current } });
      }
    });
    chan.current = c;
    setOthers({});
    return () => {
      void supabase.removeChannel(c);
      chan.current = null;
    };
  }, [room, me, loadLooks]);

  // Movement loop with a throttled position broadcast.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSent = 0;
    let sentKey = "";
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const k = keys.current;
      let dx = 0;
      let dy = 0;
      if (k.has("arrowleft") || k.has("a")) dx -= 1;
      if (k.has("arrowright") || k.has("d")) dx += 1;
      if (k.has("arrowup") || k.has("w")) dy -= 1;
      if (k.has("arrowdown") || k.has("s")) dy += 1;
      if (dx || dy) {
        target.current = null;
      } else if (target.current) {
        const tx = target.current.x - pos.current.x;
        const ty = target.current.y - pos.current.y;
        const d = Math.hypot(tx, ty);
        if (d < 4) {
          target.current = null;
        } else {
          dx = tx / d;
          dy = ty / d;
        }
      }
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        const p = pos.current;
        pos.current = {
          ...p,
          x: clamp(p.x + (dx / len) * SPEED * dt, 30, W - 30),
          y: clamp(p.y + (dy / len) * SPEED * dt, room === "plaza" ? 250 : 200, H - 30),
          face: dx < 0 ? -1 : dx > 0 ? 1 : p.face,
        };
        setMine(pos.current);
      }
      const key = `${Math.round(pos.current.x)},${Math.round(pos.current.y)}`;
      if (t - lastSent > 100 && key !== sentKey && chan.current) {
        lastSent = t;
        sentKey = key;
        void chan.current.send({ type: "broadcast", event: "pos", payload: { id: me, x: pos.current.x, y: pos.current.y, face: pos.current.face } });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [me, room]);

  const hunt = useTurkeyHunt(loadMine);
  const house = bestHouse(owned);
  const atShop = room === "plaza" && near(mine, SHOP_DOOR);
  const atHome = room === "plaza" && near(mine, HOME_DOOR);
  const atExit = room === "house" && near(mine, EXIT_DOOR);

  function teleport(p: { x: number; y: number }) {
    pos.current = { ...pos.current, ...p };
    target.current = null;
    setMine(pos.current);
  }

  function interact() {
    if (atShop) {
      setShop(true);
    } else if (atHome) {
      if (house) {
        setRoom("house");
        teleport({ x: 500, y: 500 });
      } else {
        setNote("You don't own a house yet — buy one in the shop!");
        setShop(true);
      }
    } else if (atExit) {
      setRoom("plaza");
      teleport({ x: HOME_DOOR.x, y: HOME_DOOR.y + 70 });
    }
  }

  // Keyboard controls. Re-bound each render so `interact` always sees the current position.
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.tagName === "INPUT" || (e.target as HTMLElement | null)?.tagName === "TEXTAREA";
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.includes(k)) {
        keys.current.add(k);
        e.preventDefault();
      }
      if (k === "e") interact();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const clickMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    const s = svg.current;
    if (!s) return;
    const pt = s.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = s.getScreenCTM();
    if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    target.current = { x: p.x, y: p.y };
  };

  const say = (e: FormEvent) => {
    e.preventDefault();
    const text = chat.trim().slice(0, 80);
    if (!text) return;
    pos.current = { ...pos.current, say: text, sayAt: Date.now() };
    setMine(pos.current);
    setChat("");
    void chan.current?.send({ type: "broadcast", event: "pos", payload: { id: me, ...pos.current } });
  };

  // Server-side price and balance checks happen in club_buy. The client only shows the result.
  const buy = async (id: string) => {
    const { error } = await supabase.rpc("club_buy", { _item: id });
    setNote(error ? error.message : `Bought ${CLUB_ITEMS.find((i) => i.id === id)?.name}!`);
    void loadMine();
    // Lets the desktop shell refresh the walking pets it draws from club_owned.
    window.dispatchEvent(new Event("luc1d-pets"));
  };

  const equip = async (kind: ClubKind, id: string) => {
    if (kind === "ring") {
      // The club_check_ring trigger rejects rings the user does not own.
      const { error } = await supabase.from("discard_profiles").update({ avatar_decoration: id }).eq("user_id", me);
      setNote(error ? error.message : "Ring equipped on your Discard profile!");
      return;
    }
    if (kind === "tag") {
      const { error } = await supabase.rpc("club_equip", { _slot: "tag", _item: id });
      setNote(error ? error.message : id === "none" ? "Tag removed." : "Tag equipped — it shows next to your name in Discard!");
      await loadLooks([me], true);
      return;
    }
    const { error } = await supabase.rpc("club_equip", { _slot: kind, _item: id });
    if (error) return setNote(error.message);
    setNote("Equipped!");
    await loadLooks([me], true);
    void chan.current?.send({ type: "broadcast", event: "pos", payload: { id: me, ...pos.current, restyle: true } });
  };

  const bal = wallet.earned - wallet.spent;
  const myLook = looks[me];
  const otherCount = Object.keys(others).length;
  const prompt = atShop
    ? "Enter shop"
    : atHome
      ? house
        ? "Go inside your house"
        : "Your house plot (buy a house)"
      : atExit
        ? "Leave house"
        : "";

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col bg-background text-foreground">
      <div className="shell-glass flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm">
        <span className="font-display font-bold tracking-tight">🐦 Club Bird</span>
        <span className="rounded-full bg-[var(--app-club,var(--primary))] px-2 py-px text-[10px] font-black uppercase tracking-wider text-primary-foreground">BETA</span>
        <span className="text-muted-foreground">{room === "plaza" ? "· Plaza" : "· Your house"}</span>
        <span
          className="ml-auto rounded-full border border-[color-mix(in_oklab,var(--app-club,var(--primary))_40%,transparent)] bg-[color-mix(in_oklab,var(--app-club,var(--primary))_14%,transparent)] px-3 py-1 font-mono font-semibold text-[var(--app-club,var(--primary))]"
          title={`${wallet.messages} messages sent × $0.10`}
        >
          {money(bal)}
        </span>
        <Button size="sm" variant="secondary" onClick={openBoard}><Trophy />Bal Top</Button>
        <Button size="sm" variant="secondary" onClick={() => setShop(true)}><ShoppingBag />Shop</Button>
        <Button size="sm" variant="secondary" onClick={() => setTrade(true)}><ArrowLeftRight />Trade</Button>
      </div>
      {hunt.toolbar}

      <div className="relative m-2 min-h-0 flex-1 overflow-hidden rounded-[18px] border border-border/70 shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--app-club,var(--primary))_70%,transparent)] ring-1 ring-white/5">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full cursor-pointer select-none"
          onClick={clickMove}
          role="img"
          aria-label="Club Bird world"
        >
          {room === "plaza" ? <Plaza owned={!!house} /> : <HouseRoom kind={house ?? "house-cottage"} />}
          {Object.entries(others)
            .sort((a, b) => a[1].y - b[1].y)
            .map(([id, p]) => (
              <Bird key={id} p={p} look={looks[id]} />
            ))}
          {room === "plaza" && hunt.targets}
          <Bird p={mine} look={myLook} me weapon={room === "plaza" ? hunt.shotgun : null} />
        </svg>

        {prompt && (
          <button
            onClick={interact}
            className="shell-glass absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border bg-[color-mix(in_oklab,var(--app-club,var(--primary))_85%,transparent)] px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-10px_color-mix(in_oklab,var(--app-club,var(--primary))_90%,transparent)] transition-[opacity,transform] hover:opacity-90 motion-safe:active:scale-95"
          >
            {prompt} <kbd className="ml-1 rounded bg-background/30 px-1 text-xs">E</kbd>
          </button>
        )}
        {hunt.feedback}
        <p className="shell-glass pointer-events-none absolute left-3 top-2 rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground">
          WASD / arrows or click to walk · E to enter · {otherCount} other bird{otherCount === 1 ? "" : "s"} here
        </p>
        {note && !shop && (
          <button onClick={() => setNote("")} className="shell-glass absolute right-3 top-2 rounded-full border px-2.5 py-1 text-xs text-foreground">
            {note} ✕
          </button>
        )}
      </div>

      <form onSubmit={say} className="shell-glass flex gap-2 border-t p-2.5">
        <input
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          maxLength={80}
          placeholder="Say something to birds nearby…"
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-[12px] border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <Button size="icon" aria-label="Say" className="rounded-[12px] bg-[var(--app-club,var(--primary))] text-primary-foreground"><Send /></Button>
      </form>

      {shop && (
        <Shop bal={bal} messages={wallet.messages} owned={owned} look={myLook} note={note} onBuy={buy} onEquip={equip} onClose={() => { setShop(false); setNote(""); }} />
      )}
      {hunt.modal}
      {board && <BalTop rows={rows} me={me} onClose={() => setBoard(false)} onRefresh={() => void loadBoard()} />}
      {trade && (
        <TradeCenter
          me={me}
          onClose={() => setTrade(false)}
          onChanged={() => {
            void loadMine();
            void loadLooks([me], true);
          }}
        />
      )}
    </div>
  );
}
