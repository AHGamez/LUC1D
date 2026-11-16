import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AppProps } from "../../apps/types";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Film, Play } from "lucide-react";
import { Input, Modal, Spinner, Textarea } from "../../components/ui/kit";

type App = "grime" | "tube";
type Row = Database["public"]["Tables"]["longform_videos"]["Row"];

const BUCKET = "longform";
const MAX_MB = 500;

const CFG: Record<App, { name: string; tagline: string; tabs: { id: string; label: string }[] }> = {
  grime: {
    name: "Grime Video",
    tagline: "Movies & TV shows",
    tabs: [
      { id: "all", label: "Home" },
      { id: "movie", label: "Movies" },
      { id: "show", label: "TV shows" },
    ],
  },
  tube: {
    name: "Tube For You",
    tagline: "Long-form videos from everyone on LUC1D",
    tabs: [{ id: "all", label: "Home" }],
  },
};

/**
 * Shared long-form video window. Grime Video is owner-only for posting movies and shows;
 * Tube For You lets any signed-in user post. Both read from the longform_videos table.
 */
export function LongformApp({ app, session, shell }: AppProps & { app: App }) {
  const cfg = CFG[app];
  const me = session.user?.id ?? null;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [canPost, setCanPost] = useState(false);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<{ row: Row; url: string } | null>(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("longform_videos")
      .select("*")
      .eq("app", app)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setLoadError(error.message);
      setRows([]);
      return;
    }
    setLoadError("");
    const list = data ?? [];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("discard_profiles").select("user_id, display_name").in("user_id", ids);
      setNames(Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name])));
    }
  }, [app]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!me) {
      setCanPost(false);
      return;
    }
    if (app === "tube") {
      setCanPost(true);
      return;
    }
    let alive = true;
    void supabase.rpc("discard_is_owner", { _u: me }).then(({ data }) => {
      if (alive) setCanPost(!!data);
    });
    return () => {
      alive = false;
    };
  }, [app, me]);

  const play = async (row: Row) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.path, 3600 * 4);
    if (error || !data) {
      shell.toast(error?.message ?? "Could not open this video.", "error");
      return;
    }
    setPlaying({ row, url: data.signedUrl });
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    const { error } = await supabase.from("longform_videos").delete().eq("id", row.id).eq("user_id", me ?? "");
    if (error) {
      shell.toast(error.message, "error");
      return;
    }
    await supabase.storage.from(BUCKET).remove([row.path]);
    setPlaying(null);
    void load();
  };

  const needle = query.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => (tab === "all" || r.category === tab) && r.title.toLowerCase().includes(needle));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="shell-glass flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {app === "tube" ? (
              <>
                ▶ Tube <span className="text-[var(--app-longform,var(--primary))]">For You</span>
              </>
            ) : (
              <span className="text-[var(--app-longform,var(--primary))]">{cfg.name}</span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">{cfg.tagline}</p>
        </div>
        <nav aria-label="Categories" className="flex gap-1 rounded-[12px] border border-border bg-secondary/60 p-1">
          {cfg.tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-[9px] px-3 py-1 text-xs font-medium transition-colors",
                tab === t.id ? "bg-[var(--app-longform,var(--primary))] text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles"
            aria-label="Search titles"
            className="w-44"
          />
          {canPost && (
            <Button size="sm" className="rounded-[12px] bg-[var(--app-longform,var(--primary))] text-primary-foreground" onClick={() => setPosting(true)}>
              + Post
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {playing && (
          <section className="mb-6 space-y-3">
            <video
              key={playing.url}
              src={playing.url}
              controls
              autoPlay
              className="aspect-video max-h-[60dvh] w-full rounded-[18px] border border-border bg-black shadow-[0_30px_70px_-24px_color-mix(in_oklab,var(--app-longform,var(--primary))_50%,transparent)]"
            />
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold tracking-tight">{playing.row.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {names[playing.row.user_id] ?? "Someone"} · {new Date(playing.row.created_at).toLocaleDateString()}
                  {app === "grime" && ` · ${playing.row.category === "show" ? "TV show" : "Movie"}`}
                </p>
                {playing.row.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{playing.row.description}</p>
                )}
              </div>
              {me === playing.row.user_id && (
                <Button size="sm" variant="outline" onClick={() => remove(playing.row)}>
                  Delete
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setPlaying(null)}>
                Close
              </Button>
            </div>
          </section>
        )}

        {rows === null ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : loadError ? (
          <p role="alert" className="py-16 text-center text-sm text-destructive">{loadError}</p>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-longform,var(--primary))_16%,transparent)] text-[var(--app-longform,var(--primary))]">
              {app === "grime" ? <Film className="size-7" aria-hidden /> : <Play className="size-7" aria-hidden />}
            </span>
            <p className="font-display text-base font-semibold tracking-tight">
              {rows.length ? "Nothing matches." : app === "grime" ? "No movies or shows yet." : "No videos yet."}
            </p>
            <p className="text-sm text-muted-foreground">
              {rows.length ? "Try a different search or category." : app === "grime" ? "Titles appear here once the owner posts them." : "Be the first to post!"}
            </p>
            {!rows.length && canPost && (
              <Button size="sm" className="mt-1 rounded-[12px]" onClick={() => setPosting(true)}>
                + Post
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {shown.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => play(r)}
                className="group flex flex-col rounded-[18px] text-left"
              >
                <div className="shell-glass relative flex aspect-video items-center justify-center overflow-hidden rounded-[18px] border bg-[radial-gradient(120%_90%_at_30%_10%,color-mix(in_oklab,var(--app-longform,var(--primary))_30%,transparent),transparent_60%)] text-4xl shadow-[0_14px_30px_-18px_color-mix(in_oklab,var(--app-longform,var(--primary))_60%,transparent)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:group-hover:-translate-y-1 group-hover:border-[var(--app-longform,var(--primary))] group-hover:shadow-[0_22px_40px_-16px_color-mix(in_oklab,var(--app-longform,var(--primary))_65%,transparent)]">
                  <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-black/35 text-2xl backdrop-blur-sm transition-transform motion-safe:group-hover:scale-110">
                    {app === "grime" ? (r.category === "show" ? "📺" : "🎬") : "▶"}
                  </span>
                </div>
                <p className="mt-2.5 line-clamp-2 px-0.5 font-display text-sm font-semibold leading-snug tracking-tight">{r.title}</p>
                <p className="px-0.5 text-xs text-muted-foreground">{names[r.user_id] ?? "Someone"}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {posting && me && (
        <PostDialog
          app={app}
          me={me}
          onClose={() => setPosting(false)}
          onDone={() => {
            setPosting(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function PostDialog({ app, me, onClose, onDone }: { app: App; me: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(app === "grime" ? "movie" : "video");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return setErr("Pick a video and add a title.");
    if (file.size > MAX_MB * 1024 * 1024) return setErr(`Videos must be under ${MAX_MB} MB.`);
    setBusy(true);
    setErr("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${app}/${me}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "video/mp4" });
    if (up.error) {
      setBusy(false);
      return setErr(up.error.message);
    }
    const ins = await supabase
      .from("longform_videos")
      .insert({ app, category, title: title.trim().slice(0, 120), description: desc.trim().slice(0, 2000), path, user_id: me });
    setBusy(false);
    if (ins.error) {
      await supabase.storage.from(BUCKET).remove([path]);
      return setErr(ins.error.message);
    }
    onDone();
  };

  return (
    <Modal open title={app === "grime" ? "Post a movie or show" : "Post a video"} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <input
          type="file"
          accept="video/*"
          aria-label="Video file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title" aria-label="Title" />
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={2000}
          placeholder="Description (optional)"
          rows={3}
          aria-label="Description"
        />
        {app === "grime" && (
          <div className="flex gap-2">
            <Button size="sm" variant={category === "movie" ? "default" : "outline"} onClick={() => setCategory("movie")}>
              Movie
            </Button>
            <Button size="sm" variant={category === "show" ? "default" : "outline"} onClick={() => setCategory("show")}>
              TV show
            </Button>
          </div>
        )}
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Spinner className="size-3.5 border-current border-t-transparent" />}
            {busy ? "Uploading…" : "Post"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
