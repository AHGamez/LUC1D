import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/kit";
import { AVATAR_DECORATIONS } from "./AvatarDecoration";
import { ProfileAvatar, ChatTag } from "./ProfileAvatar";
import { GIF_BANNER, GIF_PFP, GifUnlockButton, useGifUnlock } from "./GifUnlock";
import { BANNERS, NAME_EFFECTS, NameEffect, ProfileBanner } from "./NameEffect";
import { AppearanceSettings } from "./AppearanceSettings";
import { useDiscard } from "./DiscardContext";
import { GIF_UNLOCK_CENTS, isGifFile, itemPrice, money } from "./lib/club-items";
import { avatarExtension } from "./lib/discard-profile";
import type { Look } from "./lib/discard-look";
import type { Profile } from "./lib/discard-types";

const AVATAR_BUCKET = "discard-avatars";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const SIGNED_URL_SECONDS = 3600;

type UploadKind = "avatar" | "banner";

/**
 * Profile editor: picture, custom banner, preset banner, name effect, display name, status, colour, decoration,
 * plus the appearance settings. Every save goes through the user's own row; the database checks the paid items.
 */
export function ProfileSettings({ profile, look, onLook, onSaved, onClose }: { profile: Profile; look: Look; onLook: (p: Partial<Look>) => void; onSaved: () => void; onClose: () => void }) {
  const { toast } = useDiscard();
  const [name, setName] = useState(profile.display_name);
  const [color, setColor] = useState(profile.avatar_color);
  const [status, setStatus] = useState(profile.status);
  const [avatarPath, setAvatarPath] = useState<string | null>(profile.avatar_path);
  const [preview, setPreview] = useState<string | null>(profile.avatar_url);
  const [decoration, setDecoration] = useState(profile.avatar_decoration ?? "none");
  const [banner, setBanner] = useState(profile.banner ?? "blurple");
  const [bannerPath, setBannerPath] = useState<string | null>(profile.banner_path ?? null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile.banner_url ?? null);
  const [nameFx, setNameFx] = useState(profile.name_effect ?? "none");
  const [busy, setBusy] = useState(false);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const gif = useGifUnlock(profile.user_id);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("club_owned")
      .select("item_id")
      .eq("user_id", profile.user_id)
      .then(({ data }) => setOwnedItems(new Set((data ?? []).map((r) => r.item_id))));
  }, [profile.user_id]);

  const upload = async (file: File | undefined, kind: UploadKind) => {
    if (!file) return;
    const ext = avatarExtension(file.type);
    if (!ext) return toast("Choose a PNG, JPG, WebP or GIF picture.", "error");
    const gifItem = kind === "banner" ? GIF_BANNER : GIF_PFP;
    if (isGifFile(file) && !gif.owned.has(gifItem)) {
      return toast(`${kind === "banner" ? "GIF banners" : "GIF pictures"} cost ${money(GIF_UNLOCK_CENTS)}. Unlock them first.`, "error");
    }
    if (file.size > MAX_IMAGE_BYTES) return toast("Choose a picture smaller than 3 MB.", "error");
    setBusy(true);
    // User-owned upload path. The storage policy only accepts files under <user id>/ (banners under <user id>/banners/).
    const folder = kind === "banner" ? `${profile.user_id}/banners` : profile.user_id;
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return toast(error.message, "error");
    }
    const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (kind === "banner") {
      setBannerPath(path);
      setBannerPreview(data?.signedUrl ?? null);
    } else {
      setAvatarPath(path);
      setPreview(data?.signedUrl ?? null);
    }
    setBusy(false);
    toast(kind === "banner" ? "Banner ready. Save your profile to keep it." : "Picture ready. Save your profile to keep it.", "info");
  };

  const save = async () => {
    setBusy(true);
    // created_at is deliberately not sent: the database sets it from the account.
    const { error } = await supabase.from("discard_profiles").upsert({
      user_id: profile.user_id,
      display_name: name.trim().slice(0, 32) || "user",
      avatar_color: color,
      avatar_path: avatarPath,
      avatar_decoration: decoration,
      banner,
      banner_path: bannerPath,
      name_effect: nameFx,
      status: status.slice(0, 80),
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    toast(error ? error.message : "Profile saved", error ? "error" : "success");
    if (!error) onSaved();
  };

  const livePreview: Profile = { ...profile, avatar_url: preview, avatar_color: color, avatar_decoration: decoration };

  return (
    <div className="flex-1 space-y-8 overflow-y-auto p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Discard settings</h2>
        <Button size="sm" className="d-btn" onClick={onClose}>Done</Button>
      </div>

      <section className="space-y-4">
        <h3 className="font-semibold">Profile</h3>

        <div className="overflow-hidden rounded-2xl border border-[var(--d-line)] bg-[var(--d-card)]">
          <ProfileBanner banner={banner} imageUrl={bannerPreview} keepMotion className="h-20" />
          <div className="flex items-end gap-3 px-4 pb-3">
            <div className="-mt-8 rounded-full border-4 border-[var(--dc-panel)]">
              <ProfileAvatar profile={livePreview} className="size-16" showStatus={false} />
            </div>
            <div className="min-w-0 pb-0.5 font-semibold" style={{ color }}>
              <NameEffect effect={nameFx}>{name || "user"}</NameEffect>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy} className="d-btn" onClick={() => document.getElementById("discard-avatar-upload")?.click()}>
              <Upload className="size-4" />
              {busy ? "Working…" : "Upload picture"}
            </Button>
            <input id="discard-avatar-upload" aria-label="Profile picture" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { void upload(e.target.files?.[0], "avatar"); e.target.value = ""; }} />
            <GifUnlockButton item={GIF_PFP} owned={gif.owned.has(GIF_PFP)} onBought={gif.refresh} toast={toast} />
            {avatarPath && (
              <Button size="sm" disabled={busy} className="d-btn-ghost" onClick={() => { setAvatarPath(null); setPreview(null); }}>Remove picture</Button>
            )}
          </div>
          <ChatTag profile={profile} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Display name
            <Input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </Label>
          <Label>
            Status
            <Input value={status} maxLength={80} placeholder="What's up?" onChange={(e) => setStatus(e.target.value)} className="mt-1" />
          </Label>
        </div>
        <label className="flex items-center gap-3 text-sm">
          Avatar colour
          <input type="color" aria-label="Avatar colour" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded-lg border border-[var(--d-line-strong)] bg-transparent" />
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Profile banner</legend>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy} className="d-btn" onClick={() => bannerInput.current?.click()}>
              <Upload className="size-4" />
              Upload banner
            </Button>
            <input ref={bannerInput} aria-label="Custom profile banner" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { void upload(e.target.files?.[0], "banner"); e.target.value = ""; }} />
            <GifUnlockButton item={GIF_BANNER} owned={gif.owned.has(GIF_BANNER)} onBought={gif.refresh} toast={toast} />
            {bannerPath && (
              <Button size="sm" disabled={busy} className="d-btn-ghost" onClick={() => { setBannerPath(null); setBannerPreview(null); }}>Remove banner</Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {BANNERS.map((b) => {
              const selected = !bannerPath && banner === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={busy}
                  aria-label={`${b.name} banner`}
                  aria-pressed={selected}
                  onClick={() => {
                    setBanner(b.id);
                    setBannerPath(null);
                    setBannerPreview(null);
                  }}
                  className={`d-tile flex-col gap-0 overflow-hidden p-0 text-xs disabled:opacity-40 ${selected ? "ring-2 ring-[var(--dc-accent)]" : "opacity-80 hover:opacity-100"}`}
                >
                  <ProfileBanner banner={b.id} keepMotion className="h-8" />
                  <span className="block py-1">{b.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Name effect</legend>
          <div className="flex flex-wrap gap-2">
            {NAME_EFFECTS.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={nameFx === e.id}
                onClick={() => setNameFx(e.id)}
                className={`d-chip h-7 px-3 text-xs ${nameFx === e.id ? "d-chip-accent" : ""}`}
              >
                {e.glyph && <span aria-hidden="true">{e.glyph}</span>}
                {e.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Avatar decoration</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AVATAR_DECORATIONS.map((d) => {
              const locked = !!d.paid && !ownedItems.has(d.id);
              const selected = decoration === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={locked}
                  title={locked ? "Buy it in Club Bird's shop" : undefined}
                  aria-label={`${d.name} avatar decoration`}
                  aria-pressed={selected}
                  onClick={() => setDecoration(d.id)}
                  className="d-tile h-28 flex-col items-center justify-center gap-2 px-2 py-3 text-xs disabled:opacity-40"
                >
                  <ProfileAvatar profile={{ ...profile, avatar_url: preview, avatar_color: color, avatar_decoration: d.id }} className="size-10" showStatus={false} />
                  <span>{d.name}{locked ? ` · ${money(itemPrice(d.id))}` : ""}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs opacity-60">Paid rings are bought with chat money in Club Bird. Each message you send earns $0.10.</p>
        </fieldset>

        <Button disabled={busy} onClick={save} className="d-btn d-btn-primary">Save profile</Button>
      </section>

      <AppearanceSettings look={look} onLook={onLook} />
    </div>
  );
}
