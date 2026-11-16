import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Lock, Phone, UserMinus, UserPlus, Video, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ChatComposer } from "./ChatComposer";
import { ChatTag, ProfileAvatar } from "./ProfileAvatar";
import { DiscardEmpty } from "./DiscardEmpty";
import { MessageRow } from "./MessageRow";
import { NameDialog, ConfirmDialog } from "./Dialogs";
import { useDiscard } from "./DiscardContext";
import { useDmMessages } from "./lib/discard-messages";
import { uniqueSuffix } from "./lib/discard-util";
import { ownedTags } from "./lib/chat-mentions";
import type { Friend } from "./lib/discard-types";

/** Friends list, friend requests, and private one-to-one chat with voice and video calls. */
export function DirectMessages({ onCall }: { onCall: (peer: string, video: boolean) => void }) {
  const { me, profiles, look, nameOf, toast, reloadProfiles, ownedTagIds, wearTag } = useDiscard();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [peer, setPeer] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [unfriend, setUnfriend] = useState<Friend | null>(null);
  const [dms, setDmState] = useDmMessages(me, peer);
  const bottom = useRef<HTMLDivElement>(null);

  const loadFriends = async () => {
    const { data } = await supabase.from("discard_friends").select("id, requester_id, addressee_id, status");
    setFriends(data ?? []);
  };

  useEffect(() => {
    void loadFriends();
    const sub = supabase
      .channel(`discard-friends-${uniqueSuffix()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_friends" }, () => {
        void loadFriends();
        reloadProfiles();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(sub);
    };
  }, [reloadProfiles]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [dms.length]);

  const other = (f: Friend) => (f.requester_id === me ? f.addressee_id : f.requester_id);
  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending" && f.addressee_id === me);
  const outgoing = friends.filter((f) => f.status === "pending" && f.requester_id === me);

  const addFriend = async (wanted: string): Promise<string | void> => {
    const target = Object.values(profiles).find((p) => p.display_name.toLowerCase() === wanted.toLowerCase() && p.user_id !== me);
    if (!target) return "No one with that name.";
    if (friends.some((f) => other(f) === target.user_id)) return "Already friends or request pending.";
    const { error } = await supabase.from("discard_friends").insert({ requester_id: me, addressee_id: target.user_id });
    if (error) return error.message;
    toast(`Request sent to ${target.display_name}.`, "success");
    void loadFriends();
  };

  const accept = async (f: Friend) => {
    const { error } = await supabase.from("discard_friends").update({ status: "accepted" }).eq("id", f.id);
    if (error) toast(error.message, "error");
    void loadFriends();
  };

  const removeFriend = async (f: Friend) => {
    const { error } = await supabase.from("discard_friends").delete().eq("id", f.id);
    if (error) return toast(error.message, "error");
    if (other(f) === peer) setPeer("");
    void loadFriends();
  };

  const sendDm = async (content: string, imagePath: string | null) => {
    const { data, error } = await supabase.from("discard_dms").insert({ sender_id: me, recipient_id: peer, content, image_path: imagePath }).select().single();
    if (error) throw error;
    if (data) setDmState((ms) => (ms.some((x) => x.id === data.id) ? ms : [...ms, data]));
  };

  const deleteDm = async (id: string) => {
    const { error } = await supabase.from("discard_dms").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    setDmState((ms) => ms.filter((x) => x.id !== id));
  };

  return (
    <>
      <aside className="d-surface flex w-56 shrink-0 flex-col border-r border-[var(--d-line)]">
        <div className="d-header font-semibold">
          <span>Direct messages</span>
          <button type="button" aria-label="Add friend" title="Add friend" onClick={() => setAddOpen(true)} className="d-icon-btn">
            <UserPlus className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 text-sm">
          {incoming.length > 0 && <SectionLabel>Requests</SectionLabel>}
          {incoming.map((f) => (
            <div key={f.id} className="d-row text-sm">
              <span className="min-w-0 flex-1 truncate">{nameOf(f.requester_id)}</span>
              <button type="button" aria-label={`Accept ${nameOf(f.requester_id)}`} onClick={() => accept(f)} className="d-icon-btn accent">
                <Check className="size-4" />
              </button>
              <button type="button" aria-label={`Decline ${nameOf(f.requester_id)}`} onClick={() => removeFriend(f)} className="d-icon-btn">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <SectionLabel>Friends</SectionLabel>
          {accepted.length === 0 && <p className="px-2 py-1 text-xs text-[var(--d-text-faint)]">No friends yet. Use the + icon to add one.</p>}
          {accepted.map((f) => {
            const id = other(f);
            const selected = id === peer;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setPeer(id)}
                aria-current={selected ? "true" : undefined}
                className="d-row text-[13px]"
              >
                <ProfileAvatar profile={profiles[id]} className="size-7" />
                <span className="truncate">{nameOf(id)}</span>
              </button>
            );
          })}
          {outgoing.length > 0 && <SectionLabel>Pending</SectionLabel>}
          {outgoing.map((f) => (
            <div key={f.id} className="d-row text-sm text-[var(--d-text-muted)]">
              <span className="min-w-0 flex-1 truncate">{nameOf(f.addressee_id)}</span>
              <button type="button" aria-label={`Cancel request to ${nameOf(f.addressee_id)}`} onClick={() => removeFriend(f)} className="d-icon-btn">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {!peer ? (
          <DiscardEmpty icon={<Lock />} title="Start a private chat" help="Pick a friend. Only the two of you can see it." />
        ) : (
          <>
            <header className="d-header font-semibold">
              <span className="flex min-w-0 items-center gap-2">
                <Lock className="size-4 shrink-0 opacity-60" />
                <ProfileAvatar profile={profiles[peer]} className="size-6" />
                <span className="truncate">{nameOf(peer)}</span>
                <ChatTag profile={profiles[peer]} />
              </span>
              <span className="flex shrink-0 gap-1">
                <button type="button" aria-label={`Voice call ${nameOf(peer)}`} title="Voice call" onClick={() => onCall(peer, false)} className="d-icon-btn">
                  <Phone className="size-4" />
                </button>
                <button type="button" aria-label={`Video call ${nameOf(peer)}`} title="Video call" onClick={() => onCall(peer, true)} className="d-icon-btn">
                  <Video className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove friend"
                  title="Remove friend"
                  onClick={() => {
                    const f = accepted.find((x) => other(x) === peer);
                    if (f) setUnfriend(f);
                  }}
                  className="d-icon-btn danger"
                >
                  <UserMinus className="size-4" />
                </button>
              </span>
            </header>
            <div className={`flex-1 overflow-y-auto px-3 ${look.compact ? "space-y-0 py-2" : "space-y-1 py-3"}`}>
              {dms.length === 0 && <DiscardEmpty icon={<Lock />} title="Private chat" help={`This is the start of your private chat with ${nameOf(peer)}.`} />}
              {dms.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  authorId={m.sender_id}
                  kind="dm"
                  onPinned={(pinned) => setDmState((ms) => ms.map((x) => (x.id === m.id ? { ...x, pinned } : x)))}
                  onDelete={() => void deleteDm(m.id)}
                />
              ))}
              <div ref={bottom} />
            </div>
            <ChatComposer
              key={peer}
              me={me}
              placeholder={`Message ${nameOf(peer)}`}
              onSend={sendDm}
              members={[{ id: peer, name: nameOf(peer) }]}
              tags={ownedTags(ownedTagIds)}
              wearingTag={profiles[me]?.shopTag ?? ""}
              onPickTag={(id) => void wearTag(id)}
            />
          </>
        )}
      </section>

      <NameDialog
        open={addOpen}
        title="Add friend"
        label="Friend's display name"
        submitLabel="Send request"
        maxLength={32}
        onSubmit={addFriend}
        onClose={() => setAddOpen(false)}
      />
      <ConfirmDialog
        open={!!unfriend}
        title="Remove friend"
        body={unfriend ? `Remove ${nameOf(other(unfriend))} as a friend?` : ""}
        confirmLabel="Remove"
        destructive
        onClose={() => setUnfriend(null)}
        onConfirm={async () => {
          if (unfriend) await removeFriend(unfriend);
        }}
      />
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="d-label">{children}</div>;
}
