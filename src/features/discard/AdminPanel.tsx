import { useEffect, useState, type FormEvent } from "react";
import { Search, Shield } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/kit";
import { useDiscard } from "./DiscardContext";
import { ConfirmDialog } from "./Dialogs";
import { GIFT_CENTS_OPTIONS, money } from "./lib/club-items";
import type { Moderation } from "./lib/discard-moderation";
import type { Profile, Sanction } from "./lib/discard-types";

const TIMEOUT_MINUTES = [5, 20, 60] as const;
const TIMEOUT_DAYS = [1, 2, 3, 4, 5] as const;
/** Chat tags staff can hand out. Mirrors the list discard_set_tag accepts. */
const STAFF_TAGS: [string, string][] = [
  ["day-one", "Day 1"],
  ["tag-chirpy", "Chirpy"],
  ["tag-gamer", "Gamer"],
  ["tag-goat", "GOAT"],
  ["tag-rich", "Rich"],
  ["tag-legend", "Legend"],
  ["tag-whale", "Whale"],
];
const CONTROL = "text-sm outline-none";
const ACTION = "d-btn d-btn-primary";
const OUTLINE = "d-btn";
const shortDate = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
/** Gifts reset at midnight in the moderator's own timezone. The database falls back to Chicago if this is unknown. */
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

type RpcResult = PromiseLike<{ error: { message: string } | null }>;

/**
 * Moderator and owner tools: timeouts, bans, money gifts, chat tags, global messages, and roles.
 * Ranks: owner (3) > co-owner (2) > mod (1) > member (0). The database enforces every rule here too;
 * the buttons only show what the server will accept.
 */
export function AdminPanel({ moderation }: { moderation: Moderation }) {
  const { me, profiles, siteOwner, toast, reloadProfiles } = useDiscard();
  const { mods, sanctions, reload } = moderation;
  const [q, setQ] = useState("");
  const [days, setDays] = useState<number>(1);
  const [gift, setGift] = useState<number>(500);
  const [tagPick, setTagPick] = useState("day-one");
  const [note, setNote] = useState("");
  const [banTarget, setBanTarget] = useState<Profile | null>(null);
  const [canActivate, setCanActivate] = useState(false);
  const [activating, setActivating] = useState(false);

  const myProfile = me ? profiles[me] : undefined;
  const amCo = myProfile?.tag === "coowner";
  const myRank = siteOwner ? 3 : amCo ? 2 : 1;
  const rankOf = (p: Profile) => (p.tag === "owner" ? 3 : p.tag === "coowner" ? 2 : mods.has(p.user_id) ? 1 : 0);
  const tagName = STAFF_TAGS.find(([id]) => id === tagPick)?.[1] ?? tagPick;

  useEffect(() => {
    let alive = true;
    void supabase.rpc("turkey_can_activate").then(({ data, error }) => {
      if (alive) setCanActivate(!error && data === true);
    });
    return () => {
      alive = false;
    };
  }, [me]);

  const lengthLabel = days < 0 ? (days === -60 ? "1 hour" : `${-days} minutes`) : days === 1 ? "1 day" : `${days} days`;
  const timeout = (id: string) =>
    days < 0
      ? supabase.rpc("discard_timeout_minutes", { _target: id, _minutes: -days })
      : supabase.rpc("discard_sanction", { _target: id, _kind: "timeout", _days: days });

  const run = async (fn: () => RpcResult, ok: string) => {
    const { error } = await fn();
    toast(error ? error.message : ok, error ? "error" : "success");
    reload();
    reloadProfiles();
  };

  const activateTurkey = async () => {
    if (activating) return;
    setActivating(true);
    const { data, error } = await supabase.rpc("turkey_activate");
    toast(
      error ? error.message : `Turkey hunt is live for everyone until ${new Date(data ?? "").toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}!`,
      error ? "error" : "success",
    );
    if (!error) window.dispatchEvent(new Event("luc1d-turkey"));
    setActivating(false);
  };

  const announce = async (e: FormEvent) => {
    e.preventDefault();
    const content = note.trim();
    if (!content) return;
    const { error } = await supabase.from("discard_announcements").insert({ user_id: me, content });
    toast(error ? error.message : "Global message sent", error ? "error" : "success");
    if (!error) setNote("");
  };

  const list = Object.values(profiles)
    .filter((p) => p.user_id !== me && p.display_name.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 50);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="d-header gap-2 font-semibold">
        <span className="flex min-w-0 items-center gap-2">
          <Shield className="size-4 shrink-0" /> {siteOwner ? "Admin menu" : "Moderator menu"}
        </span>
        {canActivate && (
          <Button size="sm" disabled={activating} onClick={() => void activateTurkey()} className="d-btn d-btn-primary">
            🦃 {activating ? "Activating…" : "Activate Turkey"}
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--d-line)] px-4 py-3 text-sm">
        <label className="d-field min-w-48 h-9 flex-1">
          <Search className="size-4 opacity-60" />
          <input aria-label="Find a user" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a user…" className="d-bare-input min-w-0 flex-1 outline-none" />
        </label>
        <label className="flex items-center gap-2">
          Length
          <select aria-label="Timeout length" value={days} onChange={(e) => setDays(Number(e.target.value))} className={CONTROL}>
            {TIMEOUT_MINUTES.map((m) => (
              <option key={m} value={-m}>{m === 60 ? "1 hour" : `${m} minutes`}</option>
            ))}
            {TIMEOUT_DAYS.map((d) => (
              <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Give
          <select aria-label="Gift amount" value={gift} onChange={(e) => setGift(Number(e.target.value))} className={CONTROL}>
            {GIFT_CENTS_OPTIONS.map((c) => (
              <option key={c} value={c}>{money(c)}</option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="ghost" className="d-btn-ghost" onClick={() => run(() => supabase.rpc("club_grant", { _target: me ?? "", _cents: gift, _tz: TIME_ZONE }), `Gave yourself ${money(gift)}`)}>
          Give myself {money(gift)}
        </Button>
        {(siteOwner || amCo) && (
          <>
            <label className="flex items-center gap-2">
              Tag
              <select aria-label="Chat tag" value={tagPick} onChange={(e) => setTagPick(e.target.value)} className={CONTROL}>
                {STAFF_TAGS.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </label>
            <Button size="sm" variant="ghost" className="d-btn-ghost" onClick={() => run(() => supabase.rpc("discard_set_tag", { _target: me ?? "", _tag: tagPick, _on: true }), `Gave yourself the ${tagName} tag`)}>
              Give myself tag
            </Button>
          </>
        )}
      </div>

      <form onSubmit={announce} className="flex gap-2 border-b border-[var(--d-line)] px-4 py-3 text-sm">
        <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Send a global message to everyone…" aria-label="Global message" />
        <Button type="submit" disabled={!note.trim()} className="d-btn d-btn-primary">Announce</Button>
      </form>

      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {list.map((p) => {
          const s: Sanction | undefined = sanctions.find((x) => x.user_id === p.user_id);
          const isMod = mods.has(p.user_id);
          const isCo = p.tag === "coowner";
          // Only people ranked below you can be touched, and co-owners can never be touched by co-owners.
          const protectedUser = rankOf(p) >= myRank;
          const canManage = (siteOwner || (amCo && !isCo)) && p.tag !== "owner";
          return (
            <li key={p.user_id} className="d-card flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold" style={p.avatar_color ? { color: p.avatar_color } : undefined}>
                {p.display_name}
                {isMod && <span className="d-chip ml-2 align-middle">{isCo ? "CO-OWNER" : "MOD"}</span>}
                {s && (
                  <span className="ml-2 text-[0.75em] font-normal text-destructive">
                    {s.kind === "ban" ? "Banned" : "Timed out"} until {shortDate(s.until)}
                  </span>
                )}
              </span>
              {!protectedUser && (
                <>
                  <button type="button" className={ACTION} onClick={() => run(() => timeout(p.user_id), `${p.display_name} timed out for ${lengthLabel}`)}>
                    Time out for {lengthLabel}
                  </button>
                  {(siteOwner || amCo) && days > 0 && (
                    <button type="button" className="d-btn d-btn-danger" onClick={() => setBanTarget(p)}>
                      Ban
                    </button>
                  )}
                  {s && (siteOwner || amCo || s.kind !== "ban") && (
                    <button type="button" className="d-btn" onClick={() => run(() => supabase.rpc("discard_lift", { _target: p.user_id }), `Lifted for ${p.display_name}`)}>
                      Lift
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                className={ACTION}
               
                onClick={() => run(() => supabase.rpc("club_grant", { _target: p.user_id, _cents: gift, _tz: TIME_ZONE }), `Gave ${p.display_name} ${money(gift)}`)}
              >
                Give {money(gift)}
              </button>
              {canManage && (
                <>
                  <button
                    type="button"
                    className={OUTLINE}
                    onClick={() => run(() => supabase.rpc("discard_set_mod", { _target: p.user_id, _on: !isMod }), isMod ? `${p.display_name} is no longer a moderator` : `${p.display_name} is now a moderator`)}
                  >
                    {isMod ? "Remove mod" : "Make mod"}
                  </button>
                  <button
                    type="button"
                    className={OUTLINE}
                    onClick={() => run(() => supabase.rpc("discard_set_tag", { _target: p.user_id, _tag: tagPick, _on: true }), `Gave ${p.display_name} the ${tagName} tag`)}
                  >
                    Give {tagName} tag
                  </button>
                  <button
                    type="button"
                    className={OUTLINE}
                    onClick={() => run(() => supabase.rpc("discard_set_tag", { _target: p.user_id, _tag: tagPick, _on: false }), `Took the ${tagName} tag from ${p.display_name}`)}
                  >
                    Take {tagName} tag
                  </button>
                </>
              )}
              {siteOwner && p.tag !== "owner" && (
                <button
                  type="button"
                  className={OUTLINE}
                  onClick={() => run(() => supabase.rpc("discard_set_coowner", { _target: p.user_id, _on: !isCo }), isCo ? `${p.display_name} is no longer a co-owner` : `${p.display_name} is now a co-owner`)}
                >
                  {isCo ? "Remove co-owner" : "Make co-owner"}
                </button>
              )}
            </li>
          );
        })}
        {list.length === 0 && <li className="py-8 text-center text-[var(--d-text-faint)]">No users found.</li>}
      </ul>

      <ConfirmDialog
        open={!!banTarget}
        title="Ban user"
        body={banTarget ? `Ban ${banTarget.display_name} for ${days} day(s)?` : ""}
        confirmLabel="Ban"
        destructive
        onClose={() => setBanTarget(null)}
        onConfirm={async () => {
          if (!banTarget) return;
          const { error } = await supabase.rpc("discard_sanction", { _target: banTarget.user_id, _kind: "ban", _days: days });
          if (error) return error.message;
          toast(`${banTarget.display_name} banned for ${days} day(s)`, "success");
          reload();
        }}
      />
    </section>
  );
}
