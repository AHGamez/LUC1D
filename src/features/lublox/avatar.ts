import { supabase } from "../../lib/supabase";
import type { Avatar } from "./lublox";

/** The signed-in user's worn items and display name. Reads are allowed by RLS (avatars are public). */
export async function fetchAvatar(): Promise<Avatar> {
  const { data: u } = await supabase.auth.getUser();
  const id = u.user?.id;
  if (!id) return { hat: "none", shirt: "none", pants: "none", name: "Player" };
  const [a, p] = await Promise.all([
    supabase.from("lublox_avatars").select("hat, shirt, pants").eq("user_id", id).maybeSingle(),
    supabase.from("discard_profiles").select("display_name").eq("user_id", id).maybeSingle(),
  ]);
  return {
    hat: a.data?.hat ?? "none",
    shirt: a.data?.shirt ?? "none",
    pants: a.data?.pants ?? "none",
    name: p.data?.display_name || u.user?.email?.split("@")[0] || "Player",
  };
}
