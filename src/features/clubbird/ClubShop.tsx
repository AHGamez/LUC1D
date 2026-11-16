import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { CLUB_ITEMS, type ClubKind } from "./club-items";
import { Shop } from "./ClubPanels";
import type { Look } from "./BirdArt";

/**
 * Standalone Bird Shop for the SHOPS app. Prices, ownership and Christmas access are checked by the
 * database (club_buy, club_equip). The client only shows them. Needs a signed-in user (`me`).
 */
export function ClubShop({ me }: { me: string }) {
  const [wallet, setWallet] = useState({ earned: 0, spent: 0, messages: 0 });
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [look, setLook] = useState<Look | undefined>();
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [w, o, b] = await Promise.all([
      supabase.from("club_wallets").select("earned_cents, spent_cents, messages").eq("user_id", me).maybeSingle(),
      supabase.from("club_owned").select("item_id").eq("user_id", me),
      supabase.from("club_birds").select("color, hat, tag").eq("user_id", me).maybeSingle(),
    ]);
    setWallet({
      earned: w.data?.earned_cents ?? 0,
      spent: w.data?.spent_cents ?? 0,
      messages: w.data?.messages ?? 0,
    });
    setOwned(new Set((o.data ?? []).map((r) => r.item_id)));
    setLook({ color: b.data?.color ?? "default", hat: b.data?.hat ?? "none", tag: b.data?.tag ?? "none", name: "" });
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (id: string) => {
    const { error } = await supabase.rpc("club_buy", { _item: id });
    setNote(error ? error.message : `Bought ${CLUB_ITEMS.find((i) => i.id === id)?.name ?? "item"}!`);
    await load();
    window.dispatchEvent(new Event("luc1d-pets"));
  };

  const equip = async (kind: ClubKind, id: string) => {
    // Rings live on the Discard profile; everything else is equipped on the bird.
    const { error } = kind === "ring"
      ? await supabase.from("discard_profiles").update({ avatar_decoration: id }).eq("user_id", me)
      : await supabase.rpc("club_equip", { _slot: kind, _item: id });
    setNote(error ? error.message : "Equipped!");
    await load();
  };

  return (
    <div className="relative h-full min-h-[480px] bg-[var(--dc-bg,var(--background))]">
      <Shop
        bal={wallet.earned - wallet.spent}
        messages={wallet.messages}
        owned={owned}
        look={look}
        note={note}
        onBuy={buy}
        onEquip={equip}
        onClose={() => {}}
      />
    </div>
  );
}
