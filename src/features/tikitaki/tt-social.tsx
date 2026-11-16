import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Heart, MessageCircle, Send, Trash2, UserCheck, UserPlus, X } from "lucide-react";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Spinner, Textarea } from "../../components/ui/kit";
import { loadTTProfiles, TTAvatar } from "./tt-profile";

type LikeRow = { post_id: string; user_id: string };
type CommentCountRow = { post_id: string; id: string };
type CommentRow = Database["public"]["Tables"]["tikitaki_comments"]["Row"];

/**
 * Feed-wide social state. One fetch covers likes, comment counts and follows for every
 * visible clip, so reactions stay consistent across the feed. Writes are scoped to the
 * signed-in user: likes and comments by user_id, follows by follower_id.
 */
export function useVideoSocial(postIds: string[], me: string | null) {
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [comments, setComments] = useState<CommentCountRow[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idsKey = postIds.join(",");

  const reload = useCallback(async () => {
    if (!me || !idsKey) return;
    const ids = idsKey.split(",");
    const [l, c, f] = await Promise.all([
      supabase.from("tikitaki_likes").select("post_id,user_id").in("post_id", ids),
      supabase.from("tikitaki_comments").select("post_id,id").in("post_id", ids),
      supabase.from("tikitaki_follows").select("following_id").eq("follower_id", me),
    ]);
    const failure = l.error ?? c.error ?? f.error;
    if (failure) {
      setError(failure.message);
      return;
    }
    setLikes(l.data ?? []);
    setComments(c.data ?? []);
    setFollowing((f.data ?? []).map((r) => r.following_id));
  }, [idsKey, me]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleLike = async (postId: string) => {
    if (!me || busy) return;
    setBusy(true);
    setError("");
    const liked = likes.some((l) => l.post_id === postId && l.user_id === me);
    const result = liked
      ? await supabase.from("tikitaki_likes").delete().eq("post_id", postId).eq("user_id", me)
      : await supabase.from("tikitaki_likes").insert({ post_id: postId, user_id: me });
    if (result.error) setError(result.error.message);
    else
      setLikes((cur) =>
        liked
          ? cur.filter((l) => !(l.post_id === postId && l.user_id === me))
          : [...cur, { post_id: postId, user_id: me }],
      );
    setBusy(false);
  };

  const toggleFollow = async (author: string) => {
    if (!me || me === author || busy) return;
    setBusy(true);
    setError("");
    const follows = following.includes(author);
    const result = follows
      ? await supabase.from("tikitaki_follows").delete().eq("follower_id", me).eq("following_id", author)
      : await supabase.from("tikitaki_follows").insert({ follower_id: me, following_id: author });
    if (result.error) setError(result.error.message);
    else setFollowing((cur) => (follows ? cur.filter((id) => id !== author) : [...cur, author]));
    setBusy(false);
  };

  return { likes, comments, following, busy, error, toggleLike, toggleFollow, reload, setError };
}

function RailButton({
  label,
  count,
  active,
  disabled,
  onClick,
  children,
  tone,
}: {
  label: string;
  count?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "primary" | "danger";
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "shell-glass flex size-12 items-center justify-center rounded-full border transition-transform disabled:opacity-50 motion-safe:active:scale-95",
          active && tone === "danger" && "text-destructive",
          active && tone !== "danger" && "bg-[var(--app-tikitaki,var(--primary))] text-primary-foreground",
        )}
      >
        {children}
      </button>
      {count !== undefined && <span className="text-xs tabular-nums text-white drop-shadow">{count}</span>}
    </div>
  );
}

export function VideoActions({
  liked,
  likes,
  comments,
  followed,
  mine,
  disabled,
  onLike,
  onComments,
  onFollow,
}: {
  liked: boolean;
  likes: number;
  comments: number;
  followed: boolean;
  mine: boolean;
  disabled: boolean;
  onLike: () => void;
  onComments: () => void;
  onFollow: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-5 self-center">
      <RailButton label={liked ? "Unlike video" : "Like video"} count={String(likes)} active={liked} tone="danger" disabled={disabled} onClick={onLike}>
        <Heart className={cn("size-5", liked && "fill-current")} />
      </RailButton>
      <RailButton label="Open comments" count={String(comments)} onClick={onComments}>
        <MessageCircle className="size-5" />
      </RailButton>
      {!mine && (
        <RailButton label={followed ? "Unfollow creator" : "Follow creator"} count={followed ? "Following" : "Follow"} active={followed} disabled={disabled} onClick={onFollow}>
          {followed ? <UserCheck className="size-5" /> : <UserPlus className="size-5" />}
        </RailButton>
      )}
    </div>
  );
}

type Comment = CommentRow & { author: string; avatar: string };

/** Comments drawer for one clip. Users can delete only their own comments. */
export function VideoComments({
  postId,
  me,
  onClose,
  onChanged,
}: {
  postId: string;
  me: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: failure } = await supabase
      .from("tikitaki_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    if (failure) {
      setError(failure.message);
      setLoading(false);
      return;
    }
    const list: CommentRow[] = data ?? [];
    const ids = [...new Set(list.map((c) => c.user_id))];
    const tt = await loadTTProfiles(ids);
    const { data: profiles } = ids.length
      ? await supabase.from("discard_profiles").select("user_id,display_name").in("user_id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));
    setRows(
      list.map((c) => ({
        ...c,
        author: tt.get(c.user_id)?.handle ?? names.get(c.user_id) ?? "user",
        avatar: tt.get(c.user_id)?.avatarUrl ?? "",
      })),
    );
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (!me || !text.trim() || busy) return;
    setBusy(true);
    setError("");
    const { error: failure } = await supabase
      .from("tikitaki_comments")
      .insert({ post_id: postId, user_id: me, body: text.trim().slice(0, 500) });
    if (failure) setError(failure.message);
    else {
      setText("");
      await load();
      onChanged();
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!me || busy) return;
    setBusy(true);
    setError("");
    const { error: failure } = await supabase.from("tikitaki_comments").delete().eq("id", id).eq("user_id", me);
    if (failure) setError(failure.message);
    else {
      setRows((cur) => cur.filter((c) => c.id !== id));
      onChanged();
    }
    setBusy(false);
  };

  return (
    <div
      className="absolute inset-0 z-30 flex justify-end bg-background/50 backdrop-blur-[2px] motion-safe:animate-[fadeIn_200ms_ease-out]"
      onMouseDown={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Video comments"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="shell-glass flex h-full w-full max-w-sm flex-col border-l"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display font-semibold tracking-tight">Comments</h2>
          <button
            type="button"
            autoFocus
            aria-label="Close comments"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center">
              <Spinner />
            </div>
          ) : !rows.length ? (
            <p className="rounded-[12px] border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
          ) : (
            rows.map((c) => (
              <article key={c.id} className="flex gap-2.5">
                <TTAvatar profile={c.avatar ? { avatarUrl: c.avatar } : null} name={c.author} size={28} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">@{c.author}</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                  <time dateTime={c.created_at} className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </time>
                </div>
                {c.user_id === me && (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Delete comment"
                    onClick={() => remove(c.id)}
                    className="self-start rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </article>
            ))
          )}
        </div>

        {error && <p role="alert" className="px-4 pb-2 text-sm text-destructive">{error}</p>}
        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Textarea
            aria-label="Your comment"
            placeholder={me ? "Add a comment…" : "Sign in to comment"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={!me}
            className="min-h-0 flex-1 resize-none"
          />
          <Button type="submit" size="icon" disabled={!me || !text.trim() || busy} aria-label="Post comment" title="Post comment">
            {busy ? <Spinner className="size-3.5 border-current border-t-transparent" /> : <Send />}
          </Button>
        </form>
      </aside>
    </div>
  );
}
