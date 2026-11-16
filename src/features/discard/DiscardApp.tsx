import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { MessageCircle, Phone, Shield } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { useSession } from "../../lib/session";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/kit";
import "./discard.css";
import { AnnouncementBar } from "./AnnouncementBar";
import { AdminPanel } from "./AdminPanel";
import { CallPanel } from "./CallPanel";
import { ChannelSidebar } from "./ChannelSidebar";
import { ChannelView } from "./ChannelView";
import { CreateServerDialog } from "./Dialogs";
import { DirectMessages } from "./DirectMessages";
import { DiscardContext, type DiscardContextValue } from "./DiscardContext";
import { DiscardEmpty } from "./DiscardEmpty";
import { FindServers } from "./FindServers";
import { MembersSidebar } from "./MembersSidebar";
import { ProfileSettings } from "./ProfileSettings";
import { ServerRail, type Mode } from "./ServerRail";
import { PresenceProvider } from "./lib/discard-presence";
import { loadLook, saveLook, type Look } from "./lib/discard-look";
import { useProfiles } from "./lib/discard-profiles";
import { useModeration } from "./lib/discard-moderation";
import { dmRoom, ringUser, useIncomingCalls } from "./lib/discard-call";
import { uniqById } from "./lib/discard-util";
import type { Channel, Server } from "./lib/discard-types";

interface ActiveCall {
  room: string;
  video: boolean;
  label: string;
}

/** Discard: servers, channels, DMs, friends, polls, announcements, moderation, avatars, chat pictures and calls. */
export default function DiscardApp({ shell }: AppProps) {
  const { user } = useSession();
  const me = user?.id ?? null;
  const fallbackName = user?.email?.split("@")[0] ?? "user";
  const { profiles, reload: reloadProfiles } = useProfiles(me, fallbackName);
  const moderation = useModeration(me);
  const { ring, clearRing } = useIncomingCalls(me);

  const [servers, setServers] = useState<Server[]>([]);
  const [serverId, setServerId] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [mode, setMode] = useState<Mode>("server");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [look, setLook] = useState<Look>(loadLook);

  const [ownedTagIds, setOwnedTagIds] = useState<string[]>([]);

  useEffect(() => saveLook(look), [look]);
  const updateLook = useCallback((patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch })), []);

  // Chat tags this user owns. Only these can be worn; the club_equip function checks ownership.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    const load = () =>
      void supabase.from("club_owned").select("item_id").eq("user_id", me).like("item_id", "tag-%").then(({ data }) => {
        if (alive) setOwnedTagIds((data ?? []).map((r) => r.item_id));
      });
    load();
    // Club Bird and Turkey hunts announce purchases on this event.
    window.addEventListener("luc1d-pets", load);
    return () => {
      alive = false;
      window.removeEventListener("luc1d-pets", load);
    };
  }, [me]);

  const toast = shell.toast;
  const wearTag = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc("club_equip", { _slot: "tag", _item: id });
      if (error) {
        toast(error.message, "error");
        return;
      }
      toast(id === "none" ? "Tag removed." : "Tag equipped. It shows next to your name.", "success");
      reloadProfiles();
    },
    [toast, reloadProfiles],
  );

  const loadServers = useCallback(async () => {
    if (!me) return;
    const [{ data }, { data: mem }] = await Promise.all([
      supabase.from("discard_servers").select("id, name, icon, owner_id, is_public, invite_code").order("created_at"),
      supabase.from("discard_members").select("server_id").eq("user_id", me),
    ]);
    const joined = new Set((mem ?? []).map((m) => m.server_id));
    const mine = (data ?? []).filter((s) => s.owner_id === null || s.owner_id === me || joined.has(s.id));
    setServers(mine);
    setServerId((cur) => (cur && mine.some((m) => m.id === cur) ? cur : (mine[0]?.id ?? "")));
  }, [me]);

  useEffect(() => {
    void loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!serverId) {
      setChannels([]);
      setChannelId("");
      return;
    }
    let alive = true;
    supabase
      .from("discard_channels")
      .select("id, server_id, name")
      .eq("server_id", serverId)
      .order("created_at")
      .then(({ data }) => {
        if (!alive) return;
        setChannels(uniqById(data ?? []));
        setChannelId(data?.[0]?.id ?? "");
      });
    return () => {
      alive = false;
    };
  }, [serverId]);

  const siteOwner = profiles[me ?? ""]?.tag === "owner";
  const siteMod = siteOwner || (!!me && moderation.mods.has(me));
  const server = servers.find((s) => s.id === serverId);
  const channel = channels.find((c) => c.id === channelId);
  const nameOf = useCallback((id: string) => profiles[id]?.display_name ?? "Someone", [profiles]);
  const myProfile = me ? profiles[me] : undefined;

  const selectServer = (id: string) => {
    setServerId(id);
    setMode("server");
    setSettingsOpen(false);
  };

  const createServer = async (name: string, icon: string, isPublic: boolean): Promise<string | void> => {
    if (!me) return "Sign in first.";
    const { data, error } = await supabase.from("discard_servers").insert({ name, icon, owner_id: me, is_public: isPublic }).select().single();
    if (error) return error.message;
    await supabase.from("discard_members").insert({ server_id: data.id, user_id: me });
    await supabase.from("discard_channels").insert({ server_id: data.id, name: "general" });
    await loadServers();
    selectServer(data.id);
  };

  const callDm = (peer: string, video: boolean) => {
    if (!me) return;
    const room = dmRoom(me, peer);
    ringUser(peer, me, room, video);
    setCall({ room, video, label: nameOf(peer) });
  };

  const context = useMemo<DiscardContextValue | null>(
    () =>
      me
        ? {
            me,
            profiles,
            look,
            siteOwner,
            siteMod,
            toast,
            ownedTagIds,
            wearTag,
            reloadProfiles,
            openApp: shell.openApp,
            nameOf,
          }
        : null,
    [me, profiles, look, siteOwner, siteMod, ownedTagIds, wearTag, toast, shell.openApp, reloadProfiles, nameOf],
  );

  const vars = {
    "--dc-accent": look.accent,
    "--dc-bg": look.bg,
    "--dc-panel": look.panel,
    "--dc-text": look.text,
    fontSize: `${look.fontSize}px`,
  } as CSSProperties;

  if (!me || !context) {
    return (
      <div style={vars} className="discard-root flex h-full min-h-[28rem] items-center justify-center p-6 text-[var(--dc-text)]">
        {!user && <DiscardEmpty icon={<MessageCircle />} title="Sign in to use Discard" help="Chats, friends and calls use your LUC1D account." role="status" />}
        {user && <Spinner />}
      </div>
    );
  }

  if (moderation.mine?.kind === "ban") {
    return (
      <div style={vars} className="discard-root flex h-full min-h-[28rem] items-center justify-center p-6 text-[var(--dc-text)]">
        <DiscardEmpty
          icon={<Shield />}
          title="You're banned from Discard"
          help={`Your ban ends ${new Date(moderation.mine.until).toLocaleString()}.`}
        />
      </div>
    );
  }

  return (
    <PresenceProvider userId={me}>
      <DiscardContext.Provider value={context}>
        <div style={vars} className={`discard-root relative flex h-full min-h-[28rem] flex-col text-[var(--dc-text)] ${look.rounded ? "" : "discard-square"}`}>
          <AnnouncementBar isMod={siteMod} nameOf={nameOf} />

          {ring && !call && (
            <div role="alert" className="flex shrink-0 items-center gap-3 border-b border-[var(--d-line)] px-4 py-2 text-sm text-[var(--d-on-accent)]" style={{ background: "var(--d-accent-grad)" }}>
              <Phone className="size-4 shrink-0" />
              <span className="flex-1">
                {nameOf(ring.from)} is {ring.video ? "video " : ""}calling you
              </span>
              <Button className="d-btn h-8" style={{ background: "var(--d-on-accent)", color: "var(--dc-accent)", borderColor: "transparent" }} onClick={() => { setCall({ room: ring.room, video: ring.video, label: nameOf(ring.from) }); clearRing(); }}>
                Join
              </Button>
              <Button className="d-btn-ghost h-8" style={{ color: "var(--d-on-accent)" }} onClick={clearRing}>
                Ignore
              </Button>
            </div>
          )}

          {call && <CallPanel room={call.room} me={me} video={call.video} nameOf={nameOf} onLeave={() => setCall(null)} />}

          <div className="flex min-h-0 flex-1">
            <ServerRail
              servers={servers}
              serverId={serverId}
              mode={mode}
              onMode={(m) => {
                setMode(m);
                setSettingsOpen(false);
              }}
              onSelectServer={selectServer}
              onCreateServer={() => setCreateOpen(true)}
              onClubBird={() => shell.openApp("clubbird")}
            />

            {mode === "admin" && siteMod ? (
              <AdminPanel moderation={moderation} />
            ) : mode === "find" ? (
              <FindServers joinedIds={servers.map((s) => s.id)} onJoined={async (id) => { await loadServers(); selectServer(id); }} />
            ) : mode === "dm" ? (
              <DirectMessages onCall={callDm} />
            ) : (
              <>
                <ChannelSidebar
                  me={me}
                  server={server}
                  channels={channels}
                  channelId={channelId}
                  profile={myProfile}
                  onSelectChannel={setChannelId}
                  onChannelCreated={(c) => {
                    setChannels((cs) => uniqById([...cs, c]));
                    setChannelId(c.id);
                  }}
                  onServerChanged={() => void loadServers()}
                  onServerRemoved={() => {
                    setServerId("");
                    void loadServers();
                  }}
                  onSettings={() => setSettingsOpen((v) => !v)}
                />
                {settingsOpen && myProfile ? (
                  <ProfileSettings profile={myProfile} look={look} onLook={updateLook} onSaved={reloadProfiles} onClose={() => setSettingsOpen(false)} />
                ) : (
                  <ChannelView
                    me={me}
                    channel={channel}
                    timedOutUntil={moderation.mine?.until ?? null}
                    onCall={(room, video, label) => setCall({ room, video, label })}
                  />
                )}
                {server && <MembersSidebar serverId={server.id} openServer={!server.owner_id} ownerId={server.owner_id} />}
              </>
            )}
          </div>

          <CreateServerDialog open={createOpen} onCreate={createServer} onClose={() => setCreateOpen(false)} />
        </div>
      </DiscardContext.Provider>
    </PresenceProvider>
  );
}
