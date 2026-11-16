import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { Sanction } from "./discard-types";
import { uniqueSuffix } from "./discard-util";

/** Moderators and active sanctions (timeouts and bans). Reloads on changes and every minute. */
export function useModeration(me: string | null) {
  const [mods, setMods] = useState<Set<string>>(new Set());
  const [sanctions, setSanctions] = useState<Sanction[]>([]);

  const reload = useCallback(async () => {
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from("discard_moderators").select("user_id"),
      supabase.from("discard_sanctions").select("user_id, kind, until"),
    ]);
    setMods(new Set((m ?? []).map((x) => x.user_id)));
    setSanctions((s ?? []).filter((x) => new Date(x.until) > new Date()));
  }, []);

  useEffect(() => {
    if (!me) return;
    void reload();
    const sub = supabase
      .channel(`discard-mod-${uniqueSuffix()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_sanctions" }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_moderators" }, () => void reload())
      .subscribe();
    const timer = setInterval(() => void reload(), 60_000);
    return () => {
      void supabase.removeChannel(sub);
      clearInterval(timer);
    };
  }, [me, reload]);

  const mine = sanctions.find((s) => s.user_id === me);
  return { mods, sanctions, reload, mine };
}

export type Moderation = ReturnType<typeof useModeration>;
