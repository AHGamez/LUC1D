import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { Profile } from "./discard-types";

const SIGNED_URL_SECONDS = 3600;
const REFRESH_MS = 60 * 1000;

/**
 * All Discard profiles, with signed avatar URLs, verified tags, day-one badges and Club Bird chat tags.
 * Creates the signed-in user's profile row on first use. Reloads on profile changes and every minute.
 */
export function useProfiles(me: string | null, fallbackName: string) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  // Only the newest load may write. An older slow load must not overwrite fresher data.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const [{ data: rows }, { data: tags }, { data: dayOne }, { data: modRows }, { data: birdTags }] = await Promise.all([
      supabase
        .from("discard_profiles")
        .select("user_id, display_name, avatar_color, status, avatar_path, avatar_decoration, banner, banner_path, name_effect, created_at"),
      supabase.from("discard_chat_tags").select("user_id, tag"),
      supabase.from("discard_day_one_tags").select("user_id"),
      supabase.from("discard_moderators").select("user_id, coowner"),
      supabase.from("club_birds").select("user_id, tag").neq("tag", "none"),
    ]);
    const list = rows ?? [];
    // Picture and custom banner live in the private discard-avatars bucket. Both get signed URLs.
    const paths = list.flatMap((p) => [p.avatar_path, p.banner_path].filter((path): path is string => !!path));
    const signed = paths.length ? (await supabase.storage.from("discard-avatars").createSignedUrls(paths, SIGNED_URL_SECONDS)).data ?? [] : [];
    const urls = new Map(signed.flatMap((x) => (x.path && x.signedUrl ? [[x.path, x.signedUrl] as const] : [])));
    // discard_chat_tags holds "owner" or "modmgmt" (one row per account). Read-only for clients.
    const tagBy = new Map((tags ?? []).map((t) => [t.user_id, t.tag]));
    const modBy = new Map((modRows ?? []).map((m) => [m.user_id, m.coowner]));
    const dayOneSet = new Set((dayOne ?? []).map((d) => d.user_id));
    const birdBy = new Map((birdTags ?? []).map((b) => [b.user_id, b.tag]));
    if (seq !== loadSeq.current) return;

    setProfiles(
      Object.fromEntries(
        list.map((p): [string, Profile] => {
          const modCoowner = modBy.get(p.user_id);
          const modTag = modCoowner === undefined ? undefined : modCoowner ? "coowner" : "mod";
          // Owner wins, then the moderator rank (drives the admin menu rules), and Mod Management is a separate flag.
          // Keeping it separate stops a chat-tag row from hiding a co-owner's or moderator's real rank.
          const chatRole = tagBy.get(p.user_id);
          const ownerTag = chatRole === "owner" ? "owner" : undefined;
          return [
            p.user_id,
            {
              ...p,
              avatar_url: p.avatar_path ? (urls.get(p.avatar_path) ?? null) : null,
              banner_url: p.banner_path ? (urls.get(p.banner_path) ?? null) : null,
              tag: ownerTag ?? modTag,
              modMgmt: chatRole === "modmgmt",
              dayOne: dayOneSet.has(p.user_id),
              shopTag: birdBy.get(p.user_id),
            },
          ];
        }),
      ),
    );
  }, []);

  // Make sure the signed-in user has a profile row, then load everyone.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    (async () => {
      const { data: mine } = await supabase.from("discard_profiles").select("user_id").eq("user_id", me).maybeSingle();
      if (!mine) {
        await supabase.from("discard_profiles").insert({ user_id: me, display_name: fallbackName.slice(0, 32) || "user" });
      }
      if (alive) void load();
    })();
    return () => {
      alive = false;
    };
  }, [me, fallbackName, load]);

  useEffect(() => {
    const timer = setInterval(() => void load(), REFRESH_MS);
    const sub = supabase
      .channel("discard-profile-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_profiles" }, () => void load())
      .subscribe();
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(sub);
    };
  }, [load]);

  return { profiles, reload: load };
}
