import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../../lib/supabase";

// Shared presence room: everyone in Discard joins "discard-online" once, keyed by user id.
const PresenceContext = createContext<Set<string>>(new Set());

export function PresenceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [online, setOnline] = useState<Set<string>>(() => new Set([userId]));

  useEffect(() => {
    setOnline(new Set([userId]));
    const channel = supabase.channel("discard-online", { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>;
}

export function useOnline(userId?: string | null): boolean {
  const online = useContext(PresenceContext);
  return !!userId && online.has(userId);
}

export function useOnlineSet(): Set<string> {
  return useContext(PresenceContext);
}
