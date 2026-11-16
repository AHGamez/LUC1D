import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, ListMusic, Lock, Music, Pause, Play, Plus, SkipBack, SkipForward, Trash2, Upload } from "lucide-react";
import type { AppProps } from "../../apps/types";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Input, Spinner } from "../../components/ui/kit";

/** User songs live in the private music bucket and play through signed URLs. */
const BUCKET = "music";
const MAX_SONG_MB = 20;
const SIGNED_TTL = 3600 * 6;

type Playlist = Database["public"]["Tables"]["music_playlists"]["Row"];
type Track = { key: string; name: string; url: string };
type Queue = { name: string; tracks: Track[] };
type Tab = "mine" | "browse";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

async function playlistTracks(id: string): Promise<Track[]> {
  const { data } = await supabase
    .from("music_tracks")
    .select("id, title, path, position, created_at")
    .eq("playlist_id", id)
    .order("position")
    .order("created_at");
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.path), SIGNED_TTL);
  return rows
    .map((r, i) => ({ key: r.id, name: r.title, url: signed?.[i]?.signedUrl ?? "" }))
    .filter((t) => t.url);
}

/**
 * Music window: a player for songs added from this device or opened from a playlist,
 * plus playlist management (create, upload, post publicly, delete) and a browser for posted playlists.
 * The original built-in tracks are not bundled here, so the player only plays user tracks.
 */
export default function MusicApp({ session, shell }: AppProps) {
  const me = session.user?.id ?? null;
  const [queue, setQueue] = useState<Queue>({ name: "", tracks: [] });
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(0.7);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [tab, setTab] = useState<Tab>("mine");
  const audio = useRef<HTMLAudioElement>(null);
  const localUrls = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const track = queue.tracks[idx];

  useEffect(() => {
    if (audio.current) audio.current.volume = vol;
  }, [vol]);

  // Start the new source when the track changes, but only if the user is already playing.
  useEffect(() => {
    if (track && playing) void audio.current?.play().catch(() => setPlaying(false));
  }, [idx, track?.url]);

  useEffect(() => {
    const urls = localUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const addLocal = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("audio/") || /\.mp3$/i.test(f.name))
      .map((f) => {
        const url = URL.createObjectURL(f);
        localUrls.current.push(url);
        return { key: url, name: f.name.replace(/\.[^.]+$/, ""), url };
      });
    if (!added.length) return;
    setQueue((q) => ({ name: q.name || "Local files", tracks: [...q.tracks, ...added] }));
  };

  const toggle = () => {
    const a = audio.current;
    if (!a || !track) return;
    if (a.paused) {
      setPlaying(true);
      void a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const go = (d: number) => {
    if (!queue.tracks.length) return;
    setIdx((i) => (i + d + queue.tracks.length) % queue.tracks.length);
    setPlaying(true);
  };

  const openPlaylist = async (p: Playlist) => {
    const tracks = await playlistTracks(p.id);
    if (!tracks.length) {
      shell.toast(`${p.name} has no playable songs.`, "error");
      return;
    }
    setQueue({ name: p.name, tracks });
    setIdx(0);
    setPlaying(true);
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-background p-3 text-foreground sm:p-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:overflow-hidden">
      <audio
        ref={audio}
        src={track?.url}
        onEnded={() => {
          if (queue.tracks.length > 1) go(1);
          else setPlaying(false);
        }}
        onError={() => {
          if (track) shell.toast(`Could not play ${track.name}.`, "error");
          setPlaying(false);
        }}
        onTimeUpdate={(e) => setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration || 0 })}
        onLoadedMetadata={(e) => setTime((t) => ({ ...t, dur: e.currentTarget.duration || 0 }))}
      />
      <input ref={fileInput} type="file" accept="audio/*,.mp3" multiple hidden onChange={(e) => { addLocal(e.target.files); e.target.value = ""; }} />

      <section aria-label="Now playing" className="shell-glass flex min-h-0 flex-col gap-4 rounded-[18px] border p-4 sm:p-5">
        <div
          className={cn(
            "relative mx-auto flex aspect-square w-full max-w-64 items-center justify-center overflow-hidden rounded-[18px] border border-border/70 bg-[radial-gradient(90%_70%_at_30%_15%,color-mix(in_oklab,var(--app-music,var(--primary))_40%,transparent),linear-gradient(160deg,color-mix(in_oklab,var(--app-music,var(--primary))_22%,transparent_70%)] ring-1 ring-white/5 transition-shadow duration-500",
            playing ? "shadow-[0_28px_60px_-18px_color-mix(in_oklab,var(--app-music,var(--primary))_75%,transparent)]" : "shadow-[0_18px_40px_-22px_color-mix(in_oklab,var(--app-music,var(--primary))_60%,transparent)]",
          )}
        >
          <span
            className={cn(
              "grid size-28 place-items-center rounded-full bg-black/30 ring-1 ring-white/10 backdrop-blur-sm",
              playing && "motion-safe:animate-[spin_9s_linear_infinite]",
            )}
          >
            <Music className="size-12 text-[var(--app-music,var(--primary))] drop-shadow" aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0 text-center">
          <p className="truncate font-display text-lg font-bold tracking-tight">{track ? track.name : "Nothing playing"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {track ? queue.name || "Queue" : "Open a playlist or add songs from this device"}
          </p>
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={time.dur || 0}
            step={0.1}
            value={Math.min(time.cur, time.dur || 0)}
            disabled={!track}
            aria-label="Seek"
            onChange={(e) => {
              if (audio.current) audio.current.currentTime = Number(e.target.value);
            }}
            className="w-full accent-[var(--app-music,var(--primary))]"
          />
          <div className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
            <span>{fmt(time.cur)}</span>
            <span>{fmt(time.dur)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Previous" disabled={!track} onClick={() => go(-1)}>
            <SkipBack />
          </Button>
          <Button
            size="icon"
            className="size-12 rounded-full bg-[var(--app-music,var(--primary))] text-primary-foreground shadow-[0_12px_28px_-8px_color-mix(in_oklab,var(--app-music,var(--primary))_80%,transparent)] transition-transform hover:brightness-110 motion-safe:active:scale-95"
            aria-label={playing ? "Pause" : "Play"}
            disabled={!track}
            onClick={toggle}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button size="icon" variant="ghost" aria-label="Next" disabled={!track} onClick={() => go(1)}>
            <SkipForward />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Vol</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vol}
            onChange={(e) => setVol(Number(e.target.value))}
            aria-label="Volume"
            className="min-w-0 flex-1 accent-[var(--app-music,var(--primary))]"
          />
          <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload /> Add songs
          </Button>
        </div>

        {queue.tracks.length > 1 && (
          <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto text-sm">
            {queue.tracks.map((t, i) => (
              <li key={t.key}>
                <button
                  type="button"
                  aria-current={i === idx ? "true" : undefined}
                  onClick={() => {
                    setIdx(i);
                    setPlaying(true);
                  }}
                  className={cn(
                    "w-full truncate rounded-[10px] px-3 py-1.5 text-left transition-colors hover:bg-accent",
                    i === idx ? "bg-accent text-[var(--app-music,var(--primary))]" : "text-muted-foreground",
                  )}
                >
                  {i + 1}. {t.name}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Playlists" className="shell-glass flex min-h-0 flex-col gap-3 rounded-[18px] border p-4">
        <div role="tablist" aria-label="Playlist views" className="flex gap-1 rounded-[12px] border border-border bg-secondary/60 p-1 text-xs">
          {(["mine", "browse"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-[9px] px-3 py-1.5 font-medium transition-colors",
                tab === t ? "bg-[var(--app-music,var(--primary))] text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t === "mine" ? "My playlists" : "Browse posted"}
            </button>
          ))}
        </div>
        {tab === "mine" ? (
          <MyPlaylists me={me} onOpen={openPlaylist} onError={(m) => shell.toast(m, "error")} />
        ) : (
          <BrowsePlaylists onOpen={openPlaylist} />
        )}
      </section>
    </div>
  );
}

function MyPlaylists({ me, onOpen, onError }: { me: string | null; onOpen: (p: Playlist) => void; onError: (msg: string) => void }) {
  const [lists, setLists] = useState<Playlist[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef("");

  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await supabase.from("music_playlists").select("*").eq("user_id", me).order("created_at", { ascending: false });
    setLists(data ?? []);
    const { data: t } = await supabase.from("music_tracks").select("playlist_id").eq("user_id", me);
    const c: Record<string, number> = {};
    (t ?? []).forEach((r) => {
      c[r.playlist_id] = (c[r.playlist_id] ?? 0) + 1;
    });
    setCounts(c);
    setLoaded(true);
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const n = name.trim().slice(0, 60);
    if (!n || !me) return;
    const { error } = await supabase.from("music_playlists").insert({ name: n, user_id: me });
    if (error) return onError(error.message);
    setName("");
    void load();
  };

  const upload = async (files: FileList | null) => {
    const pid = target.current;
    if (!files || !me || !pid) return;
    setBusy(pid);
    let pos = counts[pid] ?? 0;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("audio/")) continue;
      if (f.size > MAX_SONG_MB * 1024 * 1024) {
        onError(`${f.name} is over ${MAX_SONG_MB} MB and was skipped.`);
        continue;
      }
      const path = `${me}/${crypto.randomUUID()}.${f.name.split(".").pop() || "mp3"}`;
      const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
      if (up.error) {
        onError(up.error.message);
        continue;
      }
      const { error } = await supabase.from("music_tracks").insert({
        playlist_id: pid,
        user_id: me,
        title: f.name.replace(/\.[^.]+$/, "").slice(0, 120),
        path,
        position: pos++,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        onError(error.message);
      }
    }
    setBusy("");
    void load();
  };

  const togglePublic = async (p: Playlist) => {
    const { error } = await supabase
      .from("music_playlists")
      .update({ is_public: !p.is_public })
      .eq("id", p.id)
      .eq("user_id", p.user_id);
    if (error) onError(error.message);
    else void load();
  };

  const remove = async (p: Playlist) => {
    if (!window.confirm(`Delete playlist "${p.name}"?`)) return;
    const { data: t } = await supabase.from("music_tracks").select("path").eq("playlist_id", p.id);
    const { error } = await supabase.from("music_playlists").delete().eq("id", p.id).eq("user_id", p.user_id);
    if (error) return onError(error.message);
    if (t?.length) await supabase.storage.from(BUCKET).remove(t.map((r) => r.path));
    void load();
  };

  if (!me) return <p className="text-sm text-muted-foreground">Sign in to make playlists.</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3"
        multiple
        hidden
        aria-label="Songs for playlist"
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New playlist name" maxLength={60} aria-label="New playlist name" />
        <Button type="submit" size="sm" disabled={!name.trim()}>
          <Plus /> Create
        </Button>
      </form>

      {!loaded ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-music,var(--primary))_16%,transparent)] text-[var(--app-music,var(--primary))]">
            <ListMusic className="size-5" aria-hidden />
          </span>
          <p className="font-display text-sm font-semibold">No playlists yet</p>
          <p className="text-xs text-muted-foreground">Make one, add songs, then post it so others can listen.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {lists.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 rounded-[12px] border border-border/60 bg-secondary/50 px-2.5 py-2 transition-colors hover:border-[color-mix(in_oklab,var(--app-music,var(--primary))_50%,transparent)] hover:bg-secondary">
              <ListMusic className="size-4 shrink-0 text-[var(--app-music,var(--primary))]" />
              <span className="min-w-0 flex-1 truncate">
                {p.name} <span className="text-[11px] text-muted-foreground">· {counts[p.id] ?? 0} songs</span>
              </span>
              <Button size="icon" variant="ghost" aria-label={`Play ${p.name}`} disabled={!counts[p.id]} onClick={() => onOpen(p)}>
                <Play />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === p.id}
                onClick={() => {
                  target.current = p.id;
                  fileRef.current?.click();
                }}
              >
                {busy === p.id ? <Spinner className="size-3" /> : <Upload />} Songs
              </Button>
              <Button
                size="sm"
                variant={p.is_public ? "secondary" : "ghost"}
                onClick={() => togglePublic(p)}
                title={p.is_public ? "Posted: anyone can listen" : "Private"}
              >
                {p.is_public ? <Globe /> : <Lock />}
                {p.is_public ? "Posted" : "Post"}
              </Button>
              <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => remove(p)}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PublicPlaylist = Playlist & { owner: string };

function BrowsePlaylists({ onOpen }: { onOpen: (p: Playlist) => void }) {
  const [lists, setLists] = useState<PublicPlaylist[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("music_playlists")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = data ?? [];
      const ids = [...new Set(rows.map((p) => p.user_id))];
      const { data: profs } = ids.length
        ? await supabase.from("discard_profiles").select("user_id, display_name").in("user_id", ids)
        : { data: [] };
      const names = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
      if (alive) setLists(rows.map((p) => ({ ...p, owner: names.get(p.user_id) ?? "someone" })));
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (lists === null) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }
  const needle = q.trim().toLowerCase();
  const shown = lists.filter((p) => `${p.name} ${p.owner}`.toLowerCase().includes(needle));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posted playlists" aria-label="Search posted playlists" />
      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-music,var(--primary))_16%,transparent)] text-[var(--app-music,var(--primary))]">
            <Globe className="size-5" aria-hidden />
          </span>
          <p className="font-display text-sm font-semibold">No posted playlists yet</p>
          <p className="text-xs text-muted-foreground">Playlists others post will show up here.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-[12px] border border-border/60 bg-secondary/50 px-2.5 py-2 transition-colors hover:border-[color-mix(in_oklab,var(--app-music,var(--primary))_50%,transparent)] hover:bg-secondary">
              <ListMusic className="size-4 shrink-0 text-[var(--app-music,var(--primary))]" />
              <span className="min-w-0 flex-1 truncate">
                {p.name} <span className="text-[11px] text-muted-foreground">by {p.owner}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => onOpen(p)}>
                <Play /> Play
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
