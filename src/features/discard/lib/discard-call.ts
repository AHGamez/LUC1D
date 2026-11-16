import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

/** Peer-to-peer media uses public STUN servers only. There is no media server, so nothing is recorded. */
export const RTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

/** Signalling payload relayed over the call room's realtime broadcast. */
export interface CallSignal {
  from: string;
  to: string;
  sdp?: RTCSessionDescriptionInit;
  ice?: RTCIceCandidateInit;
}

export interface IncomingRing {
  from: string;
  room: string;
  video: boolean;
}

/** Room names must match the original app: "ch-<channel id>" for servers and "dm-<sorted ids>" for DMs. */
export const channelRoom = (channelId: string) => `ch-${channelId}`;
export const dmRoom = (me: string, peer: string) => `dm-${[me, peer].sort().join("-")}`;

/** Rings a friend so a DM call shows up for them. Sends once the ring channel is subscribed, then cleans up. */
export function ringUser(userId: string, from: string, room: string, video: boolean) {
  const ch = supabase.channel(`ring-${userId}`);
  ch.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    ch.send({ type: "broadcast", event: "ring", payload: { from, room, video } }).finally(() => {
      setTimeout(() => void supabase.removeChannel(ch), 1000);
    });
  });
}

/** Listens for calls ringing this user. Returns the pending ring and a dismiss function. */
export function useIncomingCalls(me: string | null) {
  const [ring, setRing] = useState<IncomingRing | null>(null);
  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel(`ring-${me}`)
      .on("broadcast", { event: "ring" }, ({ payload }) => setRing(payload as IncomingRing))
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me]);
  return { ring, clearRing: () => setRing(null) };
}
