import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { xmasReleased } from "../../lib/lublox-xmas";

/**
 * Whether Grassy Plains shows its Christmas extras (snow, presents, sleigh, Christmas trees).
 * Open to everyone after release; before release only Mod Management, co-owners and the owner
 * (the database function xmas_staff decides). Same rule as the desktop-wide Christmas gate.
 */
export function useLubloxXmas(): boolean {
  const [staff, setStaff] = useState(false);
  const [released, setReleased] = useState(() => xmasReleased());
  useEffect(() => {
    let live = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        if (live) setStaff(false);
        return;
      }
      const { data: allowed } = await supabase.rpc("xmas_staff", { _u: uid });
      if (live) setStaff(!!allowed);
    };
    void check();
    const t = window.setInterval(() => setReleased(xmasReleased()), 15000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    return () => {
      live = false;
      window.clearInterval(t);
      sub.subscription.unsubscribe();
    };
  }, []);
  return staff || released;
}
