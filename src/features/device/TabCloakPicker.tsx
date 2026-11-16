import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TAB_CLOAKS, getTabCloakId, setTabCloak } from "./tabCloaks";

/** Settings control for the opt-in tab cloak. Off by default. Mount inside Settings. */
export default function TabCloakPicker() {
  const [selected, setSelected] = useState(getTabCloakId);

  const pick = (id: string) => {
    setTabCloak(id);
    setSelected(id);
  };

  return (
    <section aria-labelledby="tab-cloak-title" className="space-y-3">
      <div>
        <h3 id="tab-cloak-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Tab cloak
        </h3>
        <p className="text-sm text-muted-foreground">Optional. Changes this browser tab's name and icon. Off by default.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Tab cloaks">
        <Button variant="outline" aria-pressed={!selected} onClick={() => pick("")}>
          Off
        </Button>
        {TAB_CLOAKS.map((c) => (
          <Button key={c.id} variant="outline" aria-pressed={selected === c.id} onClick={() => pick(c.id)} className={`justify-start gap-2 rounded-[12px] ${selected === c.id ? "border-[var(--app-club,var(--primary))] bg-[color-mix(in_oklab,var(--app-club,var(--primary))_14%,transparent)]" : ""}`}>
            <img src={c.icon} alt="" width={16} height={16} className="size-4" loading="lazy" />
            {c.name}
          </Button>
        ))}
      </div>
    </section>
  );
}
