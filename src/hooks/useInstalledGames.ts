import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Game ids the signed-in user has installed, stored in the installed_games table.
 * `install` updates the list at once and rolls back if the write fails.
 */
export function useInstalledGames(userId: string | null) {
  const [installed, setInstalled] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setInstalled([]);
      return;
    }
    let alive = true;
    supabase
      .from("installed_games")
      .select("game_id")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.error("Could not load installed games", error);
        else setInstalled((data ?? []).map((r) => r.game_id));
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const install = useCallback(
    async (gameId: string) => {
      if (!userId) throw new Error("Sign in to install games.");
      setInstalled((cur) => (cur.includes(gameId) ? cur : [...cur, gameId]));
      // ignoreDuplicates => ON CONFLICT DO NOTHING, which only needs the insert policy.
      const { error } = await supabase
        .from("installed_games")
        .upsert({ user_id: userId, game_id: gameId }, { onConflict: "user_id,game_id", ignoreDuplicates: true });
      if (error) {
        setInstalled((cur) => cur.filter((id) => id !== gameId));
        throw error;
      }
    },
    [userId],
  );

  return { installed, install };
}
