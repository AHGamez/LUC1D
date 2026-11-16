import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Phone, Video } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ChatComposer, type MentionMember } from "./ChatComposer";
import { ChannelPolls } from "./ChannelPolls";
import { MessageRow } from "./MessageRow";
import { DiscardEmpty } from "./DiscardEmpty";
import { useDiscard, radius } from "./DiscardContext";
import { useChannelMessages, isLive } from "./lib/discard-messages";
import { channelRoom } from "./lib/discard-call";
import { ownedTags } from "./lib/chat-mentions";
import type { Channel } from "./lib/discard-types";

/** Messages of one channel, with polls, voice and video call buttons, and the composer. */
export function ChannelView({
  me,
  channel,
  timedOutUntil,
  onCall,
}: {
  me: string;
  channel: Channel | undefined;
  /** Set while the user is timed out: they can read but not send. */
  timedOutUntil: string | null;
  onCall: (room: string, video: boolean, label: string) => void;
}) {
  const { look, siteMod, reloadProfiles, toast, profiles, ownedTagIds, wearTag } = useDiscard();
  const channelId = channel?.id ?? "";
  const serverId = channel?.server_id ?? null;
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [messages, setMessages] = useChannelMessages(channelId, reloadProfiles);
  const bottom = useRef<HTMLDivElement>(null);
  const r = radius(look);
  const label = channel ? `#${channel.name}` : "";
  const until = timedOutUntil ? new Date(timedOutUntil).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Who can be @mentioned: the other members of this server.
  useEffect(() => {
    if (!serverId) {
      setMemberIds([]);
      return;
    }
    let alive = true;
    void supabase.from("discard_members").select("user_id").eq("server_id", serverId).then(({ data }) => {
      if (alive) setMemberIds((data ?? []).map((m) => m.user_id));
    });
    return () => {
      alive = false;
    };
  }, [serverId]);

  const mentionMembers = useMemo<MentionMember[]>(
    () => memberIds.filter((id) => id !== me).map((id) => ({ id, name: profiles[id]?.display_name ?? "someone" })),
    [memberIds, me, profiles],
  );
  const mentionTags = useMemo(() => ownedTags(ownedTagIds), [ownedTagIds]);

  const send = async (content: string, imagePath: string | null) => {
    if (!channelId) throw new Error("Choose a channel first.");
    const { data, error } = await supabase.from("discard_messages").insert({ channel_id: channelId, user_id: me, content, image_path: imagePath }).select().single();
    if (error) throw error;
    if (data) setMessages((ms) => (ms.some((x) => x.id === data.id) ? ms : [...ms, data]));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("discard_messages").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    setMessages((ms) => ms.filter((x) => x.id !== id));
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="d-header">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
          <Hash className="size-4 shrink-0 text-[var(--d-text-faint)]" />
          <span className="truncate">{channel?.name ?? "No channel"}</span>
        </span>
        {channelId && (
          <span className="flex shrink-0 gap-1">
            <button type="button" aria-label="Join voice chat" title="Join voice chat" onClick={() => onCall(channelRoom(channelId), false, label)} className="d-icon-btn">
              <Phone className="size-4" />
            </button>
            <button type="button" aria-label="Join video chat" title="Join video chat" onClick={() => onCall(channelRoom(channelId), true, label)} className="d-icon-btn">
              <Video className="size-4" />
            </button>
          </span>
        )}
      </header>

      {channelId && <ChannelPolls key={`polls-${channelId}`} channelId={channelId} me={me} isMod={siteMod} />}

      <div className={`flex-1 overflow-y-auto px-3 ${look.compact ? "space-y-0 py-2" : "space-y-1 py-3"}`}>
        {messages.length === 0 && channelId && <DiscardEmpty icon={<Hash />} title={`Welcome to ${label}`} help="No messages yet. Say hi!" />}
        {messages.filter(isLive).map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            authorId={m.user_id}
            kind="channel"
            onPinned={(pinned) => setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, pinned } : x)))}
            onDelete={() => void remove(m.id)}
          />
        ))}
        <div ref={bottom} />
      </div>

      {timedOutUntil && (
        <p role="status" className={`mx-4 mb-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive ${r}`}>
          You're timed out until {until}. You can read messages but not send them.
        </p>
      )}
      {!timedOutUntil && channelId && (
        <ChatComposer
          key={`composer-${channelId}`}
          me={me}
          placeholder={`Message ${label}`}
          onSend={send}
          members={mentionMembers}
          tags={mentionTags}
          wearingTag={profiles[me]?.shopTag ?? ""}
          onPickTag={(id) => void wearTag(id)}
        />
      )}
      {!channelId && <DiscardEmpty icon={<Hash />} title="No channel selected" help="Pick a server and channel to start chatting." />}
    </section>
  );
}
