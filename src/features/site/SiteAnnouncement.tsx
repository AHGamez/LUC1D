import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Announcement = { id: string; content: string; created_at: string };

/** Localstorage key holding the id of the last announcement the user dismissed. */
export const ANNOUNCEMENT_DISMISSED_KEY = "luc1d-site-ann-dismissed";

/**
 * The newest site-wide staff announcement, shown to everyone as a dismissible banner. Dismissing stores
 * the announcement id, so it stays hidden until a newer one is posted. Authoring is server-side only
 * (see SiteAnnouncementAuthor). Mount once, inside the signed-in shell.
 */
export function SiteAnnouncement() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("discard_announcements")
        .select("id, content, created_at")
        .eq("sitewide", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!alive) return;
      const latest = error ? null : (data?.[0] ?? null);
      const dismissed = readDismissed();
      setAnnouncement(latest && latest.id !== dismissed ? latest : null);
    };
    void load();
    const channel = supabase
      .channel(`site-ann-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_announcements" }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!announcement) return null;

  return (
    <div
      role="status"
      className="shell-glass fixed left-1/2 top-4 z-[9998] flex w-[min(92vw,420px)] -translate-x-1/2 items-start gap-3 rounded-[var(--radius-card)] border p-3 text-foreground shadow-[var(--shadow-window)]"
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-primary text-primary-foreground shadow-accent">
        <Megaphone className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="section-label">Announcement</p>
        <p className="mt-0.5 break-words text-body">{announcement.content}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          writeDismissed(announcement.id);
          setAnnouncement(null);
        }}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(id: string) {
  try {
    localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, id);
  } catch {
    /* storage disabled: the banner simply reappears on the next load */
  }
}
