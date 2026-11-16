import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { Dm, Message } from "./discard-types";
import { EXPIRY_MS } from "./discard-types";
import { expiryCutoff, mergeById, uniqueSuffix } from "./discard-util";

/** Still on screen: pinned, or posted within the two-hour window. */
export const isLive = (m: { pinned: boolean; created_at: string }) => m.pinned || Date.now() - new Date(m.created_at).getTime() < EXPIRY_MS;

/** Toggles the pin on a channel message (kind "channel") or a DM (kind "dm"). Returns the new pinned state. */
export async function togglePin(kind: "channel" | "dm", id: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("discard_toggle_pin", { _kind: kind, _id: id });
  if (error) return null;
  return !!data;
}

/** Messages of one channel, with realtime inserts, edits and deletes. `onInsert` runs after each new message. */
export function useChannelMessages(channelId: string, onInsert: () => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const insertRef = useRef(onInsert);
  useEffect(() => {
    insertRef.current = onInsert;
  });

  useEffect(() => {
    setMessages([]);
    if (!channelId) return;
    let alive = true;
    supabase
      .from("discard_messages")
      .select("*")
      .eq("channel_id", channelId)
      .or(`pinned.eq.true,created_at.gte.${expiryCutoff(EXPIRY_MS)}`)
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        if (alive) setMessages((live) => mergeById([...(data ?? [])].reverse(), live.filter((m) => m.channel_id === channelId)));
      });
    const sub = supabase
      .channel(`discard-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "discard_messages", filter: `channel_id=eq.${channelId}` }, (p) => {
        const m = p.new as Message;
        setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
        insertRef.current();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "discard_messages", filter: `channel_id=eq.${channelId}` }, (p) => {
        const m = p.new as Message;
        setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "discard_messages" }, (p) => {
        const id = (p.old as Partial<Message>).id;
        setMessages((ms) => ms.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(sub);
    };
  }, [channelId]);

  return [messages, setMessages] as const;
}

/** Private messages between `me` and `peer`, with realtime updates. */
export function useDmMessages(me: string, peer: string) {
  const [dms, setDms] = useState<Dm[]>([]);

  useEffect(() => {
    setDms([]);
    if (!peer) return;
    const inThisChat = (m: Dm) => (m.sender_id === peer && m.recipient_id === me) || (m.sender_id === me && m.recipient_id === peer);
    let alive = true;
    supabase
      .from("discard_dms")
      .select("*")
      .or(`and(sender_id.eq.${me},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${me})`)
      .or(`pinned.eq.true,created_at.gte.${expiryCutoff(EXPIRY_MS)}`)
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        if (alive) setDms((live) => mergeById([...(data ?? [])].reverse(), live.filter(inThisChat)));
      });
    const sub = supabase
      .channel(`discard-dm-${uniqueSuffix()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "discard_dms" }, (p) => {
        const m = p.new as Dm;
        if (inThisChat(m)) setDms((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "discard_dms" }, (p) => {
        const m = p.new as Dm;
        setDms((ms) => ms.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "discard_dms" }, (p) => {
        const id = (p.old as Partial<Dm>).id;
        setDms((ms) => ms.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(sub);
    };
  }, [me, peer]);

  return [dms, setDms] as const;
}
