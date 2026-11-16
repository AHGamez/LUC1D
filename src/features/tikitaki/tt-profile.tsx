import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Link2, Pencil, X } from "lucide-react";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Input, Spinner, Textarea } from "../../components/ui/kit";

/** Account pictures and banners live in the same bucket as the videos, under the owner's folder. */
export const TT_BUCKET = "tikitaki-videos";
const MAX_IMG_MB = 5;
const GIF_UNLOCK_CENTS = 5000;
export const HANDLE_RE = /^[a-z0-9_.]{3,20}$/;

type ProfileRow = Database["public"]["Tables"]["tikitaki_profiles"]["Row"];
export type TTProfile = ProfileRow & { bannerUrl?: string; avatarUrl?: string };
export type TTPostLite = { id: string; user_id: string; url?: string };

export function normalizeHandle(s: string) {
  return s.trim().replace(/^@/, "").toLowerCase();
}

export function cleanLinks(raw: string[]) {
  return raw
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((l) => (/^https?:\/\//i.test(l) ? l : `https://${l}`))
    .filter((l) => {
      try {
        return ["http:", "https:"].includes(new URL(l).protocol);
      } catch {
        return false;
      }
    });
}

const money = (cents: number) => `$${(Math.max(0, cents) / 100).toFixed(2)}`;
export const isGifFile = (f: { type: string; name: string }) => f.type === "image/gif" || /\.gif$/i.test(f.name);

/** Signs Storage URLs for every banner and account picture in one request. */
export async function loadTTProfiles(ids: string[]) {
  const map = new Map<string, TTProfile>();
  if (!ids.length) return map;
  const { data } = await supabase.from("tikitaki_profiles").select("*").in("user_id", ids);
  const rows: TTProfile[] = data ?? [];
  const paths: string[] = [];
  const slots: { row: TTProfile; key: "bannerUrl" | "avatarUrl" }[] = [];
  rows.forEach((r) => {
    if (r.banner_path) {
      paths.push(r.banner_path);
      slots.push({ row: r, key: "bannerUrl" });
    }
    if (r.avatar_path) {
      paths.push(r.avatar_path);
      slots.push({ row: r, key: "avatarUrl" });
    }
  });
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(TT_BUCKET).createSignedUrls(paths, 3600);
    slots.forEach((slot, i) => {
      const u = signed?.[i]?.signedUrl;
      if (u) slot.row[slot.key] = u;
    });
  }
  rows.forEach((r) => map.set(r.user_id, r));
  return map;
}

/** Keeps an object URL for a picked file and revokes it when the file changes. */
export function useObjectUrl(file: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return file ? url : null;
}

/** Round account picture, falling back to the handle's first letter on the banner color. */
export type TTAvatarSource = { avatarUrl?: string; handle?: string; banner_color?: string };
export function TTAvatar({ profile, name, size = 20, className }: { profile?: TTAvatarSource | null; name: string; size?: number; className?: string }) {
  if (profile?.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
      style={{ width: size, height: size, background: profile?.banner_color ?? "#7c3aed", fontSize: size * 0.45 }}
    >
      {(profile?.handle ?? name).slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Owned GIF unlocks for a user, read from club_owned. */
export function useGifUnlocks(userId: string | null) {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const refresh = useCallback(() => {
    if (!userId) return;
    void supabase
      .from("club_owned")
      .select("item_id")
      .eq("user_id", userId)
      .in("item_id", ["gif-pfp", "gif-banner"])
      .then(({ data }) => setOwned(new Set((data ?? []).map((r) => r.item_id))));
  }, [userId]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { owned, refresh };
}

/** Small unlock button for GIF pictures and banners. Hidden once owned. Purchases use the club_buy RPC. */
export function GifUnlockButton({ item, owned, onBought }: { item: "gif-pfp" | "gif-banner"; owned: Set<string>; onBought: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const label = item === "gif-pfp" ? "GIF profile picture" : "GIF banner";
  if (owned.has(item)) return <span className="text-[11px] text-muted-foreground">✓ {label} unlocked</span>;
  const buy = async () => {
    if (!window.confirm(`Buy ${label} for ${money(GIF_UNLOCK_CENTS)} of Discard money?`)) return;
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("club_buy", { _item: item });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Unlocked!");
      onBought();
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-2 text-[11px]">
      <button
        type="button"
        disabled={busy}
        onClick={buy}
        className="rounded-full border border-border px-2.5 py-1 text-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        Unlock {label} · {money(GIF_UNLOCK_CENTS)}
      </button>
      {msg && <span className="text-muted-foreground">{msg}</span>}
    </span>
  );
}

/** Glass dialog that fills the window. Closes on Escape and on a click outside the panel. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md motion-safe:animate-[fadeIn_200ms_ease-out]"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="shell-glass flex max-h-full w-full max-w-md flex-col rounded-[18px] border shadow-[0_30px_80px_-20px_color-mix(in_oklab,var(--app-tikitaki,var(--primary))_35%,transparent)]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
          <h2 className="font-display font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function ProfileView({
  userId,
  me,
  fallbackName,
  posts,
  onBack,
  onSaved,
}: {
  userId: string;
  me: string | null;
  fallbackName: string;
  posts: TTPostLite[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const [profile, setProfile] = useState<TTProfile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const mine = userId === me;

  const reload = useCallback(() => {
    void loadTTProfiles([userId]).then((m) => setProfile(m.get(userId) ?? null));
  }, [userId]);
  useEffect(() => {
    reload();
  }, [reload]);

  if (profile === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const color = profile?.banner_color ?? "#7c3aed";
  const clips = posts.filter((p) => p.user_id === userId);

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="relative aspect-[3/1] max-h-56 w-full overflow-hidden bg-muted sm:rounded-b-[18px]"
        style={{
          backgroundColor: color,
          backgroundImage: profile?.bannerUrl ? `url("${profile.bannerUrl}")` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shell-glass absolute left-3 top-3 rounded-full border p-2"
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-10">
        <div className="relative z-10 -mt-10 flex items-end justify-between gap-3">
          <div
            className="flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-background text-3xl font-bold text-white"
            style={{ background: color }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              (profile?.handle ?? fallbackName).slice(0, 1).toUpperCase()
            )}
          </div>
          {mine && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Edit profile
            </Button>
          )}
        </div>

        <h2 className="mt-3 font-display text-xl font-bold tracking-tight">@{profile?.handle ?? fallbackName}</h2>
        {!profile && mine && <p className="text-sm text-muted-foreground">Pick a username so people can find you.</p>}
        {profile?.bio && <p className="mt-2 whitespace-pre-wrap text-sm">{profile.bio}</p>}
        {!!profile?.links.length && (
          <div className="mt-2 flex flex-wrap gap-3">
            {profile.links.map((l) => (
              <a
                key={l}
                href={l}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-1 text-sm text-[var(--app-tikitaki,var(--primary))] hover:underline"
              >
                <Link2 className="size-3.5" />
                {l.replace(/^https?:\/\//, "")}
              </a>
            ))}
          </div>
        )}

        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{clips.length} videos</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {clips.map((p) => (
            <video
              key={p.id}
              src={p.url}
              muted
              preload="metadata"
              className="aspect-[9/16] w-full rounded-[12px] bg-muted object-cover ring-1 ring-border transition-transform motion-safe:hover:-translate-y-0.5"
            />
          ))}
        </div>
      </div>

      {editing && me && (
        <EditProfile
          userId={me}
          current={profile ?? null}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function EditProfile({
  userId,
  current,
  onClose,
  onSaved,
}: {
  userId: string;
  current: TTProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [handle, setHandle] = useState(current?.handle ?? "");
  const [bio, setBio] = useState(current?.bio ?? "");
  const [links, setLinks] = useState<string[]>([...(current?.links ?? []), "", "", ""].slice(0, 3));
  const [color, setColor] = useState(current?.banner_color ?? "#7c3aed");
  const [bannerPath, setBannerPath] = useState<string | null>(current?.banner_path ?? null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(current?.avatar_path ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const gif = useGifUnlocks(userId);
  const avatarPreview = useObjectUrl(avatarFile) ?? (avatarPath ? current?.avatarUrl ?? null : null);

  const save = async () => {
    const h = normalizeHandle(handle);
    if (!HANDLE_RE.test(h)) return setErr("Username must be 3–20 characters: letters, numbers, _ or .");
    if (bannerFile && isGifFile(bannerFile) && !gif.owned.has("gif-banner")) return setErr("GIF banners cost $50. Unlock them first.");
    if (avatarFile && isGifFile(avatarFile) && !gif.owned.has("gif-pfp")) return setErr("GIF profile pictures cost $50. Unlock them first.");
    if (bannerFile && (!bannerFile.type.startsWith("image/") || bannerFile.size > MAX_IMG_MB * 1024 * 1024))
      return setErr(`Banner must be an image under ${MAX_IMG_MB} MB.`);
    if (avatarFile && (!avatarFile.type.startsWith("image/") || avatarFile.size > MAX_IMG_MB * 1024 * 1024))
      return setErr(`Profile picture must be an image under ${MAX_IMG_MB} MB.`);

    setBusy(true);
    setErr("");
    const uploaded: string[] = [];
    const fail = async (message: string) => {
      if (uploaded.length) await supabase.storage.from(TT_BUCKET).remove(uploaded);
      setBusy(false);
      setErr(message);
    };

    let path = bannerPath;
    if (bannerFile) {
      path = `${userId}/banner-${crypto.randomUUID()}.${bannerFile.name.split(".").pop() || "png"}`;
      const up = await supabase.storage.from(TT_BUCKET).upload(path, bannerFile, { contentType: bannerFile.type });
      if (up.error) return fail(up.error.message);
      uploaded.push(path);
    }
    let avatar = avatarPath;
    if (avatarFile) {
      avatar = `${userId}/avatar-${crypto.randomUUID()}.${avatarFile.name.split(".").pop() || "png"}`;
      const up = await supabase.storage.from(TT_BUCKET).upload(avatar, avatarFile, { contentType: avatarFile.type });
      if (up.error) return fail(up.error.message);
      uploaded.push(avatar);
    }

    const { error } = await supabase.from("tikitaki_profiles").upsert({
      user_id: userId,
      handle: h,
      bio: bio.slice(0, 200),
      links: cleanLinks(links),
      banner_color: color,
      banner_path: path,
      avatar_path: avatar,
      updated_at: new Date().toISOString(),
    });
    if (error) return fail(error.code === "23505" ? "That username is taken." : error.message);

    setBusy(false);
    const gone = [current?.banner_path, current?.avatar_path].filter((p): p is string => !!p && p !== path && p !== avatar);
    if (gone.length) await supabase.storage.from(TT_BUCKET).remove(gone);
    onSaved();
  };

  return (
    <Sheet title="Edit profile" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Username</span>
          <Input value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={21} placeholder="your.name" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Bio ({bio.length}/200)</span>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} />
        </label>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Links (up to 3)</span>
          {links.map((l, i) => (
            <Input
              key={i}
              value={l}
              aria-label={`Link ${i + 1}`}
              placeholder="youtube.com/@you"
              onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Profile picture</span>
          <div className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-bold">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="size-full object-cover" />
              ) : (
                (handle || current?.handle || "?").slice(0, 1).toUpperCase()
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              aria-label="Profile picture file"
              onChange={(e) => {
                setAvatarFile(e.target.files?.[0] ?? null);
                setAvatarPath(null);
              }}
              className="min-w-0 flex-1 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(avatarPath || avatarFile) && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPath(null);
                }}
                className="text-xs text-muted-foreground underline"
              >
                Remove profile picture
              </button>
            )}
            <GifUnlockButton item="gif-pfp" owned={gif.owned} onBought={gif.refresh} />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Banner</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Banner color"
              className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
            />
            <input
              type="file"
              accept="image/*"
              aria-label="Banner file"
              onChange={(e) => {
                setBannerFile(e.target.files?.[0] ?? null);
                setBannerPath(null);
              }}
              className="min-w-0 flex-1 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(bannerPath || bannerFile) && (
              <button
                type="button"
                onClick={() => {
                  setBannerPath(null);
                  setBannerFile(null);
                }}
                className="text-xs text-muted-foreground underline"
              >
                Use color instead of picture
              </button>
            )}
            <GifUnlockButton item="gif-banner" owned={gif.owned} onBought={gif.refresh} />
          </div>
        </div>

        {err && <p role="alert" className="text-destructive">{err}</p>}
        <Button className="w-full" disabled={busy} onClick={save}>
          {busy && <Spinner className="size-3.5 border-current border-t-transparent" />}
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </Sheet>
  );
}
