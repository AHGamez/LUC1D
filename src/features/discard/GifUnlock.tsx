import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { GIF_UNLOCK_CENTS, money } from "./lib/club-items";

/** Paid GIF unlocks. Each is a club_owned item bought through club_buy (price set by club_price on the server). */
export const GIF_PFP = "gif-pfp";
export const GIF_BANNER = "gif-banner";
export type GifItem = typeof GIF_PFP | typeof GIF_BANNER;

const LABEL: Record<GifItem, string> = { "gif-pfp": "GIF profile pictures", "gif-banner": "GIF banners" };

/** Which GIF unlocks the user owns. Read from club_owned; buying goes through the club_buy RPC. */
export function useGifUnlock(userId: string) {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("club_owned").select("item_id").eq("user_id", userId).in("item_id", [GIF_PFP, GIF_BANNER]);
    setOwned(new Set((data ?? []).map((r) => r.item_id)));
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { owned, refresh };
}

/** Button to unlock one GIF item with Discard money. Hidden once owned. The server enforces the price. */
export function GifUnlockButton({
  item,
  owned,
  onBought,
  toast,
}: {
  item: GifItem;
  owned: boolean;
  onBought: () => void;
  toast: (text: string, kind?: "info" | "success" | "error") => void;
}) {
  const [busy, setBusy] = useState(false);
  if (owned) return <span className="text-xs opacity-70">{LABEL[item]} unlocked</span>;
  const buy = async () => {
    if (!confirm(`Buy ${LABEL[item]} for ${money(GIF_UNLOCK_CENTS)} of Discard money?`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("club_buy", { _item: item });
    setBusy(false);
    if (error) toast(error.message, "error");
    else {
      toast(`${LABEL[item]} unlocked`, "success");
      onBought();
    }
  };
  return (
    <button type="button" disabled={busy} onClick={buy} className="d-btn">
      Unlock {LABEL[item]} · {money(GIF_UNLOCK_CENTS)}
    </button>
  );
}
