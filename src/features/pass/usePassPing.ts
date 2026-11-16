import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { money } from "../clubbird/club-items";
import type { ShellApi } from "../../apps/types";

const PING_MS = 60_000;

/**
 * Pings the server once a minute while the site is visible. The server pays $10 per
 * 10 unbroken minutes to Battle Pass holders and returns 0 for everyone else.
 *
 * The desktop shell should call this once, while signed in, so the pay-out runs even when
 * the Battle Pass window is closed. Pass `enabled = !!session.user`.
 */
export function usePassPing(toast: ShellApi["toast"], enabled: boolean) {
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const ping = async () => {
      if (document.visibilityState !== "visible") return;
      const { data, error } = await supabase.rpc("club_pass_ping");
      if (!alive || error) return;
      if (typeof data === "number" && data > 0) toastRef.current(`Battle Pass: +${money(data)} for being active!`, "success");
    };
    void ping();
    const t = setInterval(() => void ping(), PING_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);
}
