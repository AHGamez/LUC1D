import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Trash2, User, Video } from "lucide-react";
import type { AppProps } from "../../apps/types";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Spinner, Textarea } from "../../components/ui/kit";
import { ProfileView, Sheet, TT_BUCKET, TTAvatar, loadTTProfiles, useObjectUrl, type TTProfile } from "./tt-profile";
import { VideoActions, VideoComments, useVideoSocial } from "./tt-social";
import { VideoEditor } from "../../components/media/VideoEditor";

type PostRow = Database["public"]["Tables"]["tikitaki_posts"]["Row"];
type Post = PostRow & { url: string; author: string; avatar: string };
const MAX_MB = 50;

/** Fisher–Yates shuffle: returns a new array in random order. */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const held = out[i] as T;
    out[i] = out[j] as T;
    out[j] = held;
  }
  return out;
}

/** TikiTaki: a vertical feed of short videos with likes, comments, follows and profiles. */
export default function TikiTakiApp({ session }: AppProps) {
  const me = session.user?.id ?? null;
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [feedError, setFeedError] = useState("");
  const [composing, setComposing] = useState(false);
  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<TTProfile | null>(null);
  const social = useVideoSocial((posts ?? []).map((p) => p.id), me);
  const feed = useRef<HTMLDivElement | null>(null);

  const refreshMine = useCallback(() => {
    if (!me) return;
    void loadTTProfiles([me]).then((m) => setMyProfile(m.get(me) ?? null));
  }, [me]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("tikitaki_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      setFeedError(error.message);
      setPosts((cur) => cur ?? []);
      return;
    }
    setFeedError("");
    const rows: Post[] = shuffle(data ?? []).map((r) => ({ ...r, url: "", author: "user", avatar: "" }));
    if (rows.length) {
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const [signed, profs, tt] = await Promise.all([
        supabase.storage.from(TT_BUCKET).createSignedUrls(rows.map((r) => r.video_path), 3600),
        supabase.from("discard_profiles").select("user_id, display_name").in("user_id", ids),
        loadTTProfiles(ids),
      ]);
      const names = new Map((profs.data ?? []).map((p) => [p.user_id, p.display_name]));
      rows.forEach((r, i) => {
        const prof = tt.get(r.user_id);
        r.url = signed.data?.[i]?.signedUrl ?? "";
        r.author = prof?.handle ?? names.get(r.user_id) ?? "user";
        r.avatar = prof?.avatarUrl ?? "";
      });
    }
    setPosts(rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    refreshMine();
  }, [refreshMine]);

  // Down/up arrow keys move the feed exactly one whole video at a time.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const el = feed.current;
      // Skip when this feed is not the visible window, a panel is open, or the user is typing.
      if (!el || el.offsetParent === null) return;
      if (composing || commentPost || viewing) return;
      if ((e.target as HTMLElement | null)?.closest("input,textarea,select,[contenteditable]")) return;
      e.preventDefault();
      el.scrollBy({ top: (e.key === "ArrowDown" ? 1 : -1) * el.clientHeight, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composing, commentPost, viewing]);

  // Chrome can snap the feed to a random clip the moment all the clips are added.
  // Hold it on the first clip until the person actually scrolls or presses a key.
  useEffect(() => {
    const el = feed.current;
    if (!el) return;
    let touched = false;
    const mark = () => {
      touched = true;
    };
    const onScroll = () => {
      if (!touched && el.scrollTop > 2) el.scrollTop = 0;
    };
    const events = ["wheel", "pointerdown", "keydown", "touchstart"] as const;
    el.addEventListener("scroll", onScroll, { passive: true });
    events.forEach((t) => window.addEventListener(t, mark, { passive: true }));
    return () => {
      el.removeEventListener("scroll", onScroll);
      events.forEach((t) => window.removeEventListener(t, mark));
    };
  }, [posts]);

  const reloadAll = useCallback(() => {
    void load();
    refreshMine();
  }, [load, refreshMine]);

  const remove = async (p: Post) => {
    if (!me || !window.confirm("Delete this video?")) return;
    const { error } = await supabase.from("tikitaki_posts").delete().eq("id", p.id).eq("user_id", me);
    if (error) {
      setFeedError(error.message);
      return;
    }
    await supabase.storage.from(TT_BUCKET).remove([p.video_path]);
    void load();
  };

  const showError = social.error || feedError;

  return (
    <div className="relative flex h-full overflow-hidden bg-background text-foreground">
      <aside className="shell-glass hidden w-52 shrink-0 flex-col gap-1.5 border-r p-3 sm:flex">
        <div className="mb-3 px-2 pt-1 font-display text-lg font-bold tracking-tight">
          Tiki<span className="text-[var(--app-tikitaki,var(--primary))]">Taki</span>
        </div>
        <Button
          onClick={() => setComposing(true)}
          disabled={!me}
          className="w-full rounded-xl bg-[var(--app-tikitaki,var(--primary))] text-primary-foreground shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--app-tikitaki,var(--primary))_70%,transparent)] transition-[transform,box-shadow] hover:brightness-110 motion-safe:active:scale-[0.98]"
        >
          <Plus /> Post
        </Button>
        <Button
          variant={viewing === null ? "secondary" : "ghost"}
          className="w-full justify-start rounded-xl"
          onClick={() => setViewing(null)}
        >
          <Video /> For you
        </Button>
        {me && (
          <Button
            variant={viewing?.id === me ? "secondary" : "ghost"}
            className="w-full justify-start rounded-xl"
            onClick={() => setViewing({ id: me, name: "you" })}
          >
            <TTAvatar profile={myProfile} name={myProfile?.handle ?? "you"} size={20} />
            Profile
          </Button>
        )}
      </aside>

      <main className="relative min-w-0 flex-1">
        {viewing ? (
          <ProfileView
            userId={viewing.id}
            me={me}
            fallbackName={viewing.name}
            posts={posts ?? []}
            onBack={() => setViewing(null)}
            onSaved={reloadAll}
          />
        ) : posts === null ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-tikitaki,var(--primary))_16%,transparent)] text-[var(--app-tikitaki,var(--primary))] [&_svg]:size-7">
              <Video aria-hidden />
            </span>
            <p className="font-display text-base font-semibold tracking-tight">No videos yet</p>
            <p className="text-sm text-muted-foreground">Be the first to post a short clip for the feed.</p>
            <Button onClick={() => setComposing(true)} disabled={!me} className="mt-2 rounded-xl">
              Post the first one
            </Button>
          </div>
        ) : (
          <div ref={feed} className="h-full snap-y snap-mandatory overflow-y-auto motion-safe:scroll-smooth">
            {posts.map((p) => (
              <Clip
                key={p.id}
                post={p}
                mine={p.user_id === me}
                onDelete={() => remove(p)}
                onAuthor={() => setViewing({ id: p.user_id, name: p.author })}
                actions={
                  <VideoActions
                    liked={social.likes.some((l) => l.post_id === p.id && l.user_id === me)}
                    likes={social.likes.filter((l) => l.post_id === p.id).length}
                    comments={social.comments.filter((c) => c.post_id === p.id).length}
                    followed={social.following.includes(p.user_id)}
                    mine={p.user_id === me}
                    disabled={!me || social.busy}
                    onLike={() => social.toggleLike(p.id)}
                    onComments={() => setCommentPost(p.id)}
                    onFollow={() => social.toggleFollow(p.user_id)}
                  />
                }
              />
            ))}
          </div>
        )}

        {me && !viewing && (
          <button
            type="button"
            onClick={() => setViewing({ id: me, name: "you" })}
            aria-label="Profile"
            className="shell-glass absolute bottom-4 left-4 rounded-full border p-3 sm:hidden"
          >
            <User className="size-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setComposing(true)}
          disabled={!me}
          aria-label="Post"
          className="absolute bottom-4 right-4 rounded-full bg-[var(--app-tikitaki,var(--primary))] p-3 text-primary-foreground shadow-[0_12px_30px_-8px_color-mix(in_oklab,var(--app-tikitaki,var(--primary))_80%,transparent)] disabled:opacity-50 sm:hidden"
        >
          <Plus className="size-5" />
        </button>

        {showError && (
          <p role="alert" className="shell-glass absolute left-4 top-4 z-10 rounded-xl border px-3 py-2 text-sm text-destructive">
            {showError}
          </p>
        )}
        {composing && me && (
          <Composer
            userId={me}
            onClose={() => setComposing(false)}
            onPosted={() => {
              setComposing(false);
              void load();
            }}
          />
        )}
        {commentPost && (
          <VideoComments
            key={commentPost}
            postId={commentPost}
            me={me}
            onClose={() => setCommentPost(null)}
            onChanged={social.reload}
          />
        )}
      </main>
    </div>
  );
}

function Clip({
  post,
  mine,
  onDelete,
  onAuthor,
  actions,
}: {
  post: Post;
  mine: boolean;
  onDelete: () => void;
  onAuthor: () => void;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.6 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section className="flex h-full snap-start items-center justify-center gap-3 p-3 sm:gap-5 sm:p-6">
      <div className="window-shadow relative aspect-[9/16] max-h-full w-full max-w-[min(26rem,calc((100dvh-6rem)*9/16))] overflow-hidden rounded-[18px] border border-border/70 bg-black ring-1 ring-white/5 shadow-[0_30px_70px_-24px_color-mix(in_oklab,var(--app-tikitaki,var(--primary))_55%,transparent)]">
        {post.url ? (
          <video ref={ref} src={post.url} loop playsInline controls className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Video unavailable</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/45 to-transparent px-4 pb-5 pt-20 text-white">
          <div className="flex items-center gap-2">
            <TTAvatar profile={post.avatar ? { avatarUrl: post.avatar } : null} name={post.author} size={32} />
            <button
              type="button"
              onClick={onAuthor}
              className="pointer-events-auto truncate font-display font-semibold tracking-tight hover:underline"
            >
              @{post.author}
            </button>
          </div>
          {post.caption && <p className="mt-2 line-clamp-3 text-sm leading-normal text-white/90">{post.caption}</p>}
        </div>
        {mine && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete video"
            className="shell-glass absolute right-3 top-3 rounded-full border p-2 transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {actions}
    </section>
  );
}

const CAPTION_MAX = 300;

function Composer({ userId, onClose, onPosted }: { userId: string; onClose: () => void; onPosted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const preview = useObjectUrl(file);

  const submit = async () => {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setErr("Pick a video file.");
    if (file.size > MAX_MB * 1024 * 1024) return setErr(`Videos must be under ${MAX_MB} MB.`);
    setBusy(true);
    setErr("");
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from(TT_BUCKET).upload(path, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      setErr(up.error.message);
      return;
    }
    const { error } = await supabase
      .from("tikitaki_posts")
      .insert({ user_id: userId, caption: caption.trim().slice(0, CAPTION_MAX), video_path: path });
    setBusy(false);
    if (error) {
      await supabase.storage.from(TT_BUCKET).remove([path]);
      setErr(error.message);
      return;
    }
    onPosted();
  };

  if (editing) {
    return (
      <Sheet title="Edit video" onClose={() => setEditing(false)}>
        <VideoEditor initialFile={file} doneLabel="Use this video" onDone={(f) => { setFile(f); setEditing(false); }} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Post a video" onClose={onClose}>
      <div className="space-y-4 text-sm">
        {preview && <video src={preview} className="max-h-64 w-full rounded-[14px] bg-black" controls />}
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-[14px] border border-dashed border-border bg-secondary/40 p-5 text-center text-muted-foreground transition-colors hover:border-[var(--app-tikitaki,var(--primary))] hover:bg-secondary/70",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <span className="text-foreground">{file ? file.name : "Choose a video"}</span>
          <span className="text-xs">MP4, WebM or MOV · up to {MAX_MB} MB</span>
          <input
            type="file"
            accept="video/*"
            aria-label="Video file"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => setEditing(true)}>
          {file ? "Edit this video" : "Make / edit a video"}
        </Button>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">
            Caption ({caption.length}/{CAPTION_MAX})
          </span>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={CAPTION_MAX}
            rows={2}
            placeholder="Say something…"
          />
        </label>
        {err && <p role="alert" className="text-destructive">{err}</p>}
        <Button className="w-full" disabled={!file || busy} onClick={submit}>
          {busy && <Spinner className="size-3.5 border-current border-t-transparent" />}
          {busy ? "Uploading…" : "Post"}
        </Button>
      </div>
    </Sheet>
  );
}

