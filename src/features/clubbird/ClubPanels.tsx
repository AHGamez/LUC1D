import { useEffect, useState, type ReactNode } from "react";
import { Home, ShoppingBag, Trophy, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { CLUB_ITEMS, isHiddenWithoutXmas, money, type BoardRow, type ClubKind } from "./club-items";
import { HouseIcon, Look, MiniBird, PetSprite, RingPreview } from "./BirdArt";
import { useXmasAccess } from "../xmas/xmasAccess";

/** Closes an overlay on Escape. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function Overlay({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  useEscape(onClose);
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 p-3 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} onMouseDown={(e) => e.stopPropagation()} className="shell-glass flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[18px] border shadow-[0_30px_80px_-20px_color-mix(in_oklab,var(--app-club,var(--primary))_45%,transparent)]">
        {children}
      </div>
    </div>
  );
}

const SHOP_TABS: [ClubKind, string][] = [
  ["color", "Bird colors"],
  ["hat", "Hats"],
  ["ring", "PFP rings"],
  ["house", "Houses"],
  ["tag", "Chat tags"],
  ["pet", "Shimejis"],
];

const actionBtn = "w-full";

export function Shop({
  bal, messages, owned, look, note, onBuy, onEquip, onClose,
}: {
  bal: number;
  messages: number;
  owned: Set<string>;
  look?: Look | undefined;
  note: string;
  onBuy: (id: string) => void;
  onEquip: (kind: ClubKind, id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ClubKind>("color");
  const xmas = useXmasAccess();
  // Limited Christmas items need Christmas access; free gift tags only show once owned. The database enforces both.
  const items = CLUB_ITEMS.filter(
    (i) => i.kind === tab && i.id !== "pet-turkey" && (xmas || !isHiddenWithoutXmas(i)) && (!i.gift || owned.has(i.id)),
  );

  return (
    <Overlay onClose={onClose} label="Bird shop">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <ShoppingBag className="size-5 text-[var(--app-club,var(--primary))]" />
        <h2 className="font-display font-bold tracking-tight text-foreground">Bird Shop</h2>
        <span className="ml-auto text-right text-xs">
          <b className="font-mono text-sm text-primary">{money(bal)}</b>
          <br />
          <span className="text-muted-foreground">{messages} messages × $0.10</span>
        </span>
        <button aria-label="Close shop" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border px-2 pt-2">
        {SHOP_TABS.map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-t-[10px] px-3 py-1.5 text-sm transition-colors ${tab === k ? "bg-accent font-semibold text-foreground shadow-[inset_0_-2px_0_var(--app-club,var(--primary))]" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3">
        {(tab === "color" || tab === "hat") && (
          <ShopCard
            label={tab === "color" ? "Classic orange" : "No hat"}
            preview={<MiniBird color={tab === "color" ? "default" : look?.color ?? "default"} hat={tab === "hat" ? "none" : look?.hat ?? "none"} />}
            action={
              <Button size="sm" variant="secondary" className={actionBtn} onClick={() => onEquip(tab, tab === "color" ? "default" : "none")}>
                {(tab === "color" ? look?.color === "default" : look?.hat === "none") ? "Wearing" : "Equip"}
              </Button>
            }
          />
        )}
        {tab === "tag" && (
          <ShopCard
            label="No tag"
            preview={<span className="block text-center text-xs text-muted-foreground">Member</span>}
            action={
              <Button size="sm" variant="secondary" className={actionBtn} onClick={() => onEquip("tag", "none")}>
                {(look?.tag ?? "none") === "none" ? "Wearing" : "Equip"}
              </Button>
            }
          />
        )}
        {items.map((i) => {
          const has = owned.has(i.id);
          const wearing = (i.kind === "color" && look?.color === i.id) || (i.kind === "hat" && look?.hat === i.id) || (i.kind === "tag" && look?.tag === i.id);
          const preview =
            i.kind === "ring" ? <RingPreview id={i.id} />
              : i.kind === "house" ? <HouseIcon kind={i.id} />
              : i.kind === "pet" ? <div className="relative mx-auto h-10 w-12"><PetSprite kind={i.id} /></div>
              : i.kind === "tag" ? <span className="mx-auto block w-fit rounded-md border px-2 py-0.5 text-xs font-bold" style={{ color: i.swatch, borderColor: i.swatch }}>{i.name}</span>
              : <MiniBird color={i.kind === "color" ? i.id : look?.color ?? "default"} hat={i.kind === "hat" ? i.id : look?.hat ?? "none"} />;
          let action: ReactNode;
          if (!has) {
            action = (
              <Button size="sm" className={actionBtn} disabled={bal < i.cents} onClick={() => onBuy(i.id)}>
                {bal < i.cents ? `Need ${money(i.cents - bal)}` : "Buy"}
              </Button>
            );
          } else if (i.kind === "house" || i.kind === "pet") {
            action = (
              <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                {i.kind === "house" && <Home className="size-3" />}
                {i.kind === "pet" ? "Owned · walks on your tabs" : "Owned"}
              </span>
            );
          } else {
            action = (
              <Button size="sm" variant="secondary" className={actionBtn} onClick={() => onEquip(i.kind, i.id)}>
                {wearing ? "Wearing" : "Equip"}
              </Button>
            );
          }
          return <ShopCard key={i.id} label={i.limited ? `${i.name} · Limited` : i.name} price={money(i.cents)} preview={preview} action={action} />;
        })}
      </div>
      <p role="status" className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        {note || (tab === "house" ? "Walk to your house plot on the right of the plaza to go inside." : tab === "ring" ? "Rings show on your Discard profile picture." : "Earn money by chatting in Discard — every message is $0.10.")}
      </p>
    </Overlay>
  );
}

function ShopCard({ label, price, preview, action }: { label: string; price?: string; preview: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[14px] border border-border bg-background/40 p-3 text-center transition-[border-color,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--app-club,var(--primary))_55%,transparent)]">
      <div className="flex h-14 items-center">{preview}</div>
      <div className="text-xs font-semibold text-foreground">{label}</div>
      {price && <div className="font-mono text-xs text-primary">{price}</div>}
      {action}
    </div>
  );
}

export function BalTop({ rows, me, onClose, onRefresh }: { rows: BoardRow[]; me: string; onClose: () => void; onRefresh: () => void }) {
  const myRank = rows.findIndex((r) => r.userId === me);
  return (
    <Overlay onClose={onClose} label="Bal Top leaderboard">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Trophy className="size-5 text-[var(--app-club,var(--primary))]" />
        <h2 className="font-display font-bold tracking-tight text-foreground">Bal Top</h2>
        <span className="text-xs text-muted-foreground">who&apos;s richest</span>
        <button aria-label="Close leaderboard" onClick={onClose} className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nobody has money yet — chat in Discard to earn your first $0.10.</p>
        ) : (
          <ol>
            {rows.slice(0, 50).map((r, i) => (
              <li key={r.userId} className={`flex items-center gap-2 rounded-[12px] px-2 py-1.5 ${r.userId === me ? "bg-[color-mix(in_oklab,var(--app-club,var(--primary))_16%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--app-club,var(--primary))_35%,transparent)]" : ""}`}>
                <span className="w-7 shrink-0 text-center font-mono text-sm font-bold text-muted-foreground">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                <MiniBird color={r.color} hat={r.hat} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {r.name}
                  {r.userId === me && <span className="ml-1 text-[10px] uppercase text-muted-foreground">you</span>}
                </span>
                <span className="shrink-0 text-right text-[11px] text-muted-foreground">{r.messages} msg</span>
                <span className="w-16 shrink-0 text-right font-mono text-sm font-semibold text-primary">{money(r.cents)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>{myRank >= 0 ? `You're #${myRank + 1} of ${rows.length}.` : "You're not on the board yet."} Every Discard message is $0.10.</span>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={onRefresh}>Refresh</Button>
      </div>
    </Overlay>
  );
}

export { Overlay };
