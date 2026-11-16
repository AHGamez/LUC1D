import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Spinner, Textarea } from "../../components/ui/kit";
import { supabase } from "../../lib/supabase";
import { apiCall } from "./api";

const MAX_CHARS = 500;

type Row = { id: string; content: string; created_at: string };

/**
 * Staff panel for site-wide announcements. Shows nothing unless the signed-in account ranks as a
 * moderator or above (checked by the database). Publishing and removing go through /api/site/announcement,
 * which checks the rank again. Mount it wherever staff tools live, with the rest of the moderation UI.
 */
export function SiteAnnouncementAuthor({ onChange }: { onChange?: () => void }) {
  const [staff, setStaff] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("discard_announcements").select("id, content, created_at").eq("sitewide", true).order("created_at", { ascending: false }).limit(10);
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (alive) setStaff(false);
        return;
      }
      const { data: rank } = await supabase.rpc("discard_rank", { _u: uid });
      if (!alive) return;
      setStaff((rank ?? 0) >= 1);
      if ((rank ?? 0) >= 1) void load();
    })().catch(() => {
      if (alive) setStaff(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (staff !== true) return null;

  async function publish() {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    setMessage(null);
    const result = await apiCall<{ ok: true }>("/api/site/announcement", "POST", { content });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setText("");
    setMessage("Announcement posted.");
    await load();
    onChange?.();
  }

  async function remove(id: string) {
    setBusy(true);
    setMessage(null);
    const result = await apiCall<{ ok: true }>("/api/site/announcement", "POST", { remove: id });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    await load();
    onChange?.();
  }

  return (
    <section aria-label="Site announcements" className="surface-card flex flex-col gap-4 p-5">
      <div>
        <p className="section-label">Staff</p>
        <h2 className="mt-1 text-title font-semibold text-foreground">Site announcement</h2>
        <p className="mt-1 text-body text-muted-foreground">Shown as a banner to everyone until they dismiss it. A new post replaces the old banner.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          value={text}
          maxLength={MAX_CHARS}
          rows={3}
          placeholder="Write an announcement"
          aria-label="Announcement text"
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <span className="text-caption text-muted-foreground">{text.length}/{MAX_CHARS}</span>
          <Button className="ml-auto" disabled={busy || !text.trim()} onClick={() => void publish()}>
            {busy ? <Spinner className="size-4" /> : null} Publish
          </Button>
        </div>
      </div>

      {message && <p role="status" className="text-body text-muted-foreground">{message}</p>}

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Recent site announcements">
          {rows.map((row) => (
            <li key={row.id} className="surface-control flex items-start gap-3 p-3">
              <p className="min-w-0 flex-1 break-words text-body text-foreground">{row.content}</p>
              <button
                type="button"
                aria-label="Remove announcement"
                disabled={busy}
                onClick={() => void remove(row.id)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
