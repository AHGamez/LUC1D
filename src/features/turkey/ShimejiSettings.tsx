import { useEffect, useState } from "react";
import { CLUB_ITEMS } from "@/features/clubbird/club-items";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { ShimejiSprite, ShimejiStyles } from "@/shell/extras/Shimeji";
import { useShimejiPrefs } from "@/shell/extras/shimejiPrefs";

/**
 * One on/off switch per owned Shimeji. Mount it in the Settings app; it reads and writes the
 * shared store, so the tab-bar walkers update immediately. Needs no props.
 */
export function ShimejiSettings() {
  const { isPetEnabled, setPetEnabled } = useShimejiPrefs();
  const [owned, setOwned] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setOwned([]);
        return;
      }
      const { data } = await supabase.from("club_owned").select("item_id").eq("user_id", user.id).like("item_id", "pet-%");
      if (alive) setOwned((data ?? []).map((r) => r.item_id));
    };
    void load();
    window.addEventListener("luc1d-pets", load);
    return () => {
      alive = false;
      window.removeEventListener("luc1d-pets", load);
    };
  }, []);

  return (
    <section className="space-y-3" aria-labelledby="shimeji-switches-title">
      <ShimejiStyles />
      <h3 id="shimeji-switches-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Shimejis</h3>
      {owned === null && <p className="text-body text-muted-foreground">Loading your Shimejis…</p>}
      {owned !== null && !owned.length && (
        <p className="text-body text-muted-foreground">No Shimejis owned yet. Buy them in Club Bird or the Turkey Hunt fall shop.</p>
      )}
      {owned !== null && owned.length > 0 && (
        <ul className="settings-group">
          {owned.map((id) => {
            const on = isPetEnabled(id);
            const name = CLUB_ITEMS.find((i) => i.id === id)?.name ?? id;
            return (
              <li key={id} className="flex items-center gap-3 px-4 py-3">
                <span className="size-8 shrink-0" aria-hidden>
                  <ShimejiSprite kind={id} />
                </span>
                <span id={`shimeji-${id}`} className="min-w-0 flex-1 break-words text-body">{name}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={`shimeji-${id}`}
                  onClick={() => setPetEnabled(id, !on)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none",
                    on ? "bg-primary" : "bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0.5 top-0.5 size-5 rounded-full bg-background shadow transition-transform duration-150 motion-reduce:transition-none",
                      on && "translate-x-5",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
