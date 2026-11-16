import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Christmas release instant. Mirrors public.xmas_access() (migration 0071): from this moment everyone
 * can see and buy Christmas items. Before it, only owners, co-owners and Mod Management (xmas_staff).
 * The database enforces the same gate; this only decides what the UI shows.
 */
export const XMAS_RELEASE = Date.parse("2026-11-15T10:00:00Z");
export const xmasReleased = (now = Date.now()) => now >= XMAS_RELEASE;

/**
 * True when the viewer may see Christmas items. Staff (owners, co-owners, Mod Management) get them early
 * through xmas_staff(); everyone gets them after the release instant. Toggles `html.xmas` for the seasonal styles.
 */
export function useXmasAccess(): boolean {
  const [staff, setStaff] = useState(false);
  const [released, setReleased] = useState(() => xmasReleased());

  useEffect(() => {
    let live = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) { if (live) setStaff(false); return; }
      const { data: allowed } = await supabase.rpc("xmas_staff", { _u: uid });
      if (live) setStaff(allowed === true);
    };
    void check();
    setReleased(xmasReleased());
    const timer = window.setInterval(() => setReleased(xmasReleased()), 15_000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => {
      live = false;
      window.clearInterval(timer);
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const ok = staff || released;
  useEffect(() => {
    document.documentElement.classList.toggle("xmas", ok);
  }, [ok]);
  return ok;
}
