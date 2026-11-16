import { lazy, Suspense } from "react";
import { ArrowLeft, Coins } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { LBX_ITEMS, type Avatar, type LbxItem } from "./lublox";
import { useLoad } from "./useLoad";

const AvatarPreview = lazy(() => import("./AvatarPreview"));

type Toast = (text: string, kind?: "info" | "success" | "error") => void;

export function LubloxShop({
  onBack,
  avatar,
  onAvatarChange,
  toast,
}: {
  onBack: () => void;
  avatar: Avatar | undefined;
  onAvatarChange: () => void;
  toast: Toast;
}) {
  const store = useLoad(
    async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id;
      if (!id) throw new Error("Sign in to use the avatar shop.");
      const [w, o] = await Promise.all([
        supabase.from("club_wallets").select("earned_cents, spent_cents").eq("user_id", id).maybeSingle(),
        supabase.from("club_owned").select("item_id").eq("user_id", id),
      ]);
      return {
        balance: (w.data?.earned_cents ?? 0) - (w.data?.spent_cents ?? 0),
        owned: new Set((o.data ?? []).map((r) => r.item_id)),
      };
    },
    [],
  );

  const refresh = () => {
    store.reload();
    onAvatarChange();
  };

  const equip = async (item: LbxItem, on: boolean) => {
    const { error } = await supabase.rpc("lublox_equip", { _slot: item.slot, _item: on ? item.id : "none" });
    if (error) toast(error.message, "error");
    refresh();
  };

  const buy = async (item: LbxItem) => {
    // The price is set by the database (club_price); the client only names the item.
    const { error } = await supabase.rpc("club_buy", { _item: item.id });
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast(`Bought ${item.name}`, "success");
    await equip(item, true);
  };

  return (
    <div className="flex min-h-full flex-col gap-6 p-5 sm:p-8">
      <header className="shell-glass flex flex-wrap items-center gap-3 rounded-[18px] border p-4">
        <Button size="icon" variant="ghost" aria-label="Back to Lublox" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="font-display text-2xl font-black tracking-tight text-foreground">Avatar shop</h1>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--app-lublox,var(--primary))_40%,transparent)] bg-[color-mix(in_oklab,var(--app-lublox,var(--primary))_12%,transparent)] px-3 py-1.5 font-mono text-sm font-semibold text-foreground">
          <Coins className="size-4 text-[var(--app-lublox,var(--primary))]" /> ${((store.data?.balance ?? 0) / 100).toFixed(2)}
        </span>
      </header>
      <p className="-mt-4 text-sm text-muted-foreground">Uses your Discard coins, the same wallet as Club Bird.</p>
      {store.error && (
        <p role="alert" className="text-sm text-destructive">
          {store.error.message}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="shell-glass h-72 overflow-hidden rounded-[18px] border">
          {avatar && (
            <Suspense
              fallback={
                <div role="status" className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading preview…
                </div>
              }
            >
              <AvatarPreview avatar={avatar} />
            </Suspense>
          )}
        </div>
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {LBX_ITEMS.filter((item) => !item.gift || store.data?.owned.has(item.id)).map((item) => {
            const owned = store.data?.owned.has(item.id);
            const worn = avatar?.[item.slot] === item.id;
            return (
              <article key={item.id} className="shell-glass flex flex-col rounded-[18px] border p-3 text-card-foreground transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5">
                <div className="mb-2 h-16 rounded-[12px] border border-white/10 shadow-inner" style={{ background: item.color }} aria-hidden="true" />
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-xs capitalize text-muted-foreground">
                  {item.slot} · ${(item.price / 100).toFixed(2)}
                </p>
                <div className="mt-auto pt-3">
                  {owned ? (
                    <Button
                      className="w-full"
                      size="sm"
                      variant={worn ? "secondary" : "default"}
                      onClick={() => void equip(item, !worn)}
                    >
                      {worn ? "Take off" : "Wear"}
                    </Button>
                  ) : (
                    <Button className="w-full" size="sm" onClick={() => void buy(item)} disabled={!store.data}>
                      Buy
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
