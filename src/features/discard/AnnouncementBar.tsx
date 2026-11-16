import { useEffect, useState } from "react";
import { Megaphone, Trash2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Announcement } from "./lib/discard-types";
import { uniqueSuffix } from "./lib/discard-util";

const DAY_MS = 24 * 60 * 60 * 1000;
const HIDDEN_KEY = "discard-ann-hidden";

/** Latest global message from the last 24 hours. Viewers can dismiss it; moderators can remove it for everyone. */
export function AnnouncementBar({ isMod, nameOf }: { isMod: boolean; nameOf: (id: string) => string }) {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [hidden, setHidden] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDDEN_KEY));
    } catch {
      /* storage blocked: nothing is hidden */
    }
    const load = async () => {
      const { data } = await supabase
        .from("discard_announcements")
        .select("id, content, created_at, user_id")
        .gt("created_at", new Date(Date.now() - DAY_MS).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      setAnn(data?.[0] ?? null);
    };
    void load();
    const ch = supabase.channel(`ann-${uniqueSuffix()}`).on("postgres_changes", { event: "*", schema: "public", table: "discard_announcements" }, () => void load()).subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  if (!ann || hidden === ann.id) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(HIDDEN_KEY, ann.id);
    } catch {
      /* ignore */
    }
    setHidden(ann.id);
  };

  return (
    <div role="status" className="flex shrink-0 items-center gap-2 border-b border-[var(--d-line)] px-4 py-2 text-sm text-[var(--d-on-accent)]" style={{ background: "var(--d-accent-grad)" }}>
      <Megaphone className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        <b className="mr-1">{nameOf(ann.user_id)}:</b>
        {ann.content}
      </span>
      {isMod && (
        <button
          type="button"
          aria-label="Remove global message"
          title="Remove for everyone"
          onClick={async () => {
            await supabase.from("discard_announcements").delete().eq("id", ann.id);
          }}
          className="d-icon-btn on-accent"
        >
          <Trash2 className="size-4" />
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="d-icon-btn on-accent">
        <X className="size-4" />
      </button>
    </div>
  );
}
