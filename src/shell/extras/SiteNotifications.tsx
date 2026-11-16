import { useEffect, useRef } from "react";
import type { ShellApi } from "../../apps/types";
import updateLog from "../../data/update-log.json";

const SEEN_KEY = "luc1d-seen-update";

export interface SiteNotificationsProps {
  toast: ShellApi["toast"];
}

/**
 * Announces a new site update once per browser. Renders nothing.
 * Only the update notice is ported. The original also had realtime DM and server-join alerts and
 * click sounds; those depend on the Discard tables and site-sounds, so they are not included here.
 */
export default function SiteNotifications({ toast }: SiteNotificationsProps) {
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    const latest = updateLog.entries[0];
    if (!latest) return;

    let previous: string | null;
    try {
      previous = localStorage.getItem(SEEN_KEY);
      localStorage.setItem(SEEN_KEY, latest.id);
    } catch {
      return; // storage blocked: skip the notice rather than repeat it on every visit
    }
    // First visit (no record) and repeat visits (already seen) stay quiet.
    if (!previous || previous === latest.id) return;

    const timer = window.setTimeout(() => {
      toastRef.current(`LUC1D just updated ✨ ${latest.notes.join(" ")}`, "info");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
