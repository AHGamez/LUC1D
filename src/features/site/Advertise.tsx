import { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { Button } from "../../components/ui/Button";
import { Input, Modal, Spinner } from "../../components/ui/kit";
import { supabase } from "../../lib/supabase";
import { AD_COIN_CENTS, AD_IMAGE_TYPES, AD_MAX_CHARS, AD_SLOTS } from "./ad-rules";
import { apiCall, isStripeCheckoutUrl } from "./api";

type Ad = { slot: number; body: string; imageUrl: string | null };

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * Advertise app: 100 paid slots. Each slot holds a picture and up to 100 characters. Slots are bought
 * with Discard money (ad_buy_coins, checked by the database) or with a $1 card checkout (started and
 * recorded by the server). Taken slots are read through /api/ads because the ad rows are owner-only.
 */
export default function Advertise({ session, shell }: AppProps) {
  const userId = session.user?.id ?? null;
  const [ads, setAds] = useState<Map<number, Ad>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const result = await apiCall<{ ads: Ad[] }>("/api/ads", "GET");
    if (result.ok) {
      setAds(new Map(result.data.ads.map((ad) => [ad.slot, ad])));
      setLoadError(null);
    } else {
      setLoadError(result.error);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const close = () => {
    if (busy) return;
    setPick(null);
    setBody("");
    setFile(null);
    setFormError(null);
  };

  /** Uploads the picture into the signed-in user's own folder and returns its storage path. */
  async function uploadPicture(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) throw new Error("Sign in first");
    if (!file) throw new Error("Pick a picture");
    const ext = AD_IMAGE_TYPES[file.type];
    if (!ext) throw new Error("Picture must be PNG, JPG, WEBP or GIF");
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("site-ads").upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    return path;
  }

  async function buyWithCoins() {
    if (pick === null) return;
    setBusy(true);
    setFormError(null);
    try {
      const image = await uploadPicture();
      const { error } = await supabase.rpc("ad_buy_coins", { _slot: pick, _body: body.trim(), _image: image });
      if (error) throw new Error(error.message);
      shell.toast("Your ad is live!", "success");
      setPick(null);
      setBody("");
      setFile(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not buy this slot");
    } finally {
      setBusy(false);
    }
  }

  async function buyWithCard() {
    if (pick === null) return;
    setBusy(true);
    setFormError(null);
    try {
      const image = await uploadPicture();
      const result = await apiCall<{ url: string }>("/api/ads/checkout", "POST", { slot: pick, body: body.trim(), image });
      if (!result.ok) throw new Error(result.error);
      if (!isStripeCheckoutUrl(result.data.url)) throw new Error("Checkout did not return a valid payment page.");
      window.location.assign(result.data.url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not start checkout");
      setBusy(false);
    }
  }

  const valid = body.trim().length > 0 && body.length <= AD_MAX_CHARS && file !== null;
  const open = AD_SLOTS - ads.size;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-card text-card-foreground">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="grid size-10 place-items-center rounded-[var(--radius-control)] bg-[color-mix(in_oklab,var(--app-donate,var(--primary))_18%,transparent)] text-[var(--app-donate,var(--primary))]">
          <Megaphone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-title font-semibold tracking-tight">Advertise</h1>
          <p className="text-caption text-muted-foreground">
            {open} of {AD_SLOTS} slots open · {money(AD_COIN_CENTS)} Discard money or $1
          </p>
        </div>
      </header>

      {!userId ? (
        <p className="m-auto p-6 text-center text-body text-muted-foreground">Sign in to buy an ad slot.</p>
      ) : loading ? (
        <div className="m-auto flex items-center gap-2 text-body text-muted-foreground">
          <Spinner className="size-4" /> Loading slots
        </div>
      ) : loadError ? (
        <p role="alert" className="m-auto rounded-[var(--radius-control)] bg-destructive/10 px-4 py-3 text-body text-destructive">
          {loadError}
        </p>
      ) : (
        <div className="grid flex-1 auto-rows-[8.5rem] grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] content-start gap-3 overflow-y-auto p-4">
          {Array.from({ length: AD_SLOTS }, (_, i) => i + 1).map((n) => {
            const ad = ads.get(n);
            if (ad) {
              return (
                <div key={n} className="surface-card relative overflow-hidden">
                  {ad.imageUrl && <img src={ad.imageUrl} alt="" className="h-full w-full object-cover" />}
                  <p className="absolute inset-x-0 bottom-0 break-words bg-background/75 p-2 text-caption leading-tight text-foreground backdrop-blur">
                    {ad.body}
                  </p>
                </div>
              );
            }
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPick(n)}
                className="surface-control flex flex-col items-center justify-center gap-1 border-dashed text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="font-display text-title font-semibold">#{n}</span>
                <span className="text-caption">Buy this slot</span>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={pick !== null} title={pick !== null ? `Slot #${pick}` : "Slot"} onClose={close}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-body">
            <span className="font-medium">Picture</span>
            <Input
              type="file"
              accept={Object.keys(AD_IMAGE_TYPES).join(",")}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-body">
            <span className="font-medium">Ad text</span>
            <Input value={body} maxLength={AD_MAX_CHARS} placeholder="Your ad text" onChange={(e) => setBody(e.target.value)} />
            <span className="self-end text-caption text-muted-foreground">{body.length}/{AD_MAX_CHARS}</span>
          </label>
          {formError && (
            <p role="alert" className="rounded-[var(--radius-control)] bg-destructive/10 px-3 py-2 text-body text-destructive">
              {formError}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={!valid || busy} onClick={() => void buyWithCoins()}>
              {busy ? <Spinner className="size-4" /> : null} Pay {money(AD_COIN_CENTS)} Discard money
            </Button>
            <Button className="flex-1" variant="secondary" disabled={!valid || busy} onClick={() => void buyWithCard()}>
              Pay $1 by card
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
