import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ProfileAvatar, ChatTag } from "./ProfileAvatar";
import { ProfileBanner, NameEffect } from "./NameEffect";
import { useDiscard } from "./DiscardContext";
import { useOnlineSet } from "./lib/discard-presence";
import { uniqueSuffix } from "./lib/discard-util";
import { joinedLabel } from "./lib/discard-profile";

/** Member list for a server, split into online and offline. Open servers (no owner) list every profile. */
export function MembersSidebar({ serverId, openServer, ownerId = null }: { serverId: string; openServer: boolean; ownerId?: string | null }) {
  const { profiles, nameOf, reloadProfiles } = useDiscard();
  const online = useOnlineSet();
  const [ids, setIds] = useState<string[]>([]);
  const [openCard, setOpenCard] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      if (openServer) {
        if (live) setIds(Object.keys(profiles));
        return;
      }
      const { data } = await supabase.from("discard_members").select("user_id").eq("server_id", serverId);
      if (live) setIds((data ?? []).map((m) => m.user_id));
    };
    void load();
    const ch = supabase
      .channel(`members-${serverId}-${uniqueSuffix()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_members", filter: `server_id=eq.${serverId}` }, () => {
        void load();
        reloadProfiles();
      })
      .subscribe();
    return () => {
      live = false;
      void supabase.removeChannel(ch);
    };
  }, [serverId, openServer, profiles, reloadProfiles]);

  const sorted = [...ids].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  // Roles: the server owner is listed on top. Everyone else is grouped by presence.
  const owner = ownerId && sorted.includes(ownerId) ? [ownerId] : [];
  const rest = sorted.filter((id) => id !== ownerId);
  const on = rest.filter((id) => online.has(id));
  const off = rest.filter((id) => !online.has(id));

  const Row = ({ id }: { id: string }) => {
    const p = profiles[id];
    const open = openCard === id;
    const joined = joinedLabel(p?.created_at);
    return (
      <div className={online.has(id) ? "" : "opacity-60"}>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${nameOf(id)}, ${online.has(id) ? "online" : "offline"}. Show profile`}
          onClick={() => setOpenCard(open ? null : id)}
          className={`d-row w-full text-left text-sm ${open ? "bg-[var(--d-hover)]" : ""}`}
        >
          <ProfileAvatar profile={p} className="size-8" />
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--dc-text)]">
            <NameEffect effect={p?.name_effect}>{nameOf(id)}</NameEffect>
          </span>
        </button>
        {open && (
          <div className="mb-2 overflow-hidden rounded-xl border border-[var(--d-line)] bg-[var(--d-card)] text-[var(--dc-text)]">
            <ProfileBanner banner={p?.banner} imageUrl={p?.banner_url} className="h-14" />
            <div className="-mt-7 space-y-1 px-3 pb-3">
              <div className="inline-block rounded-full border-4 border-[var(--dc-panel)]">
                <ProfileAvatar profile={p} className="size-14" showStatus={false} />
              </div>
              <div className="pt-1 text-base font-bold" style={p?.avatar_color ? { color: p.avatar_color } : undefined}>
                <NameEffect effect={p?.name_effect}>{nameOf(id)}</NameEffect>
              </div>
              <ChatTag profile={p} />
              {p?.status && <p className="text-xs opacity-70">{p.status}</p>}
              {joined && <p className="text-[11px] font-medium uppercase tracking-wide opacity-50">{joined}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside aria-label="Members" className="d-surface hidden w-56 shrink-0 flex-col overflow-y-auto border-l border-[var(--d-line)] px-2 pb-3 lg:flex">
      {owner.length > 0 && (
        <>
          <div className="d-label">Owner</div>
          {owner.map((id) => <Row key={id} id={id} />)}
        </>
      )}
      <div className="d-label">Online — {on.length}</div>
      {on.map((id) => <Row key={id} id={id} />)}
      <div className="d-label">Offline — {off.length}</div>
      {off.map((id) => <Row key={id} id={id} />)}
    </aside>
  );
}
