import type { ReactNode } from "react";
import type { Layout } from "../lib/prefs";

type PickedLayout = Exclude<Layout, "">;

/** First-run screen: pick the glass, LUC1D sidebar, or PS5 console layout. Changeable later in Settings. */
export function LayoutChooser({ onPick }: { onPick: (layout: PickedLayout) => void }) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-display font-bold tracking-tight text-foreground">Pick your layout</h2>
          <p className="text-body text-muted-foreground">You can change this any time in Settings.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <LayoutCard id="glass" name="Glass" hint="Big clock, a glass widget panel and a curved app dock." onPick={onPick}>
            <div className="relative mb-4 h-28 overflow-hidden rounded-[var(--radius-control)] border border-border bg-card p-2.5">
              <div className="h-3 w-16 rounded bg-foreground/70" />
              <div className="mt-1.5 h-2 w-10 rounded bg-secondary" />
              <div className="absolute right-2.5 top-2.5 h-3 w-12 rounded-full bg-secondary" />
              <div className="absolute bottom-2.5 left-2.5 h-9 w-12 rounded-[10px] bg-secondary/70" />
              <div className="absolute bottom-2.5 right-2.5 flex gap-1 rounded-full bg-secondary/70 p-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="size-3 rounded-full bg-primary/70" />
                ))}
              </div>
            </div>
          </LayoutCard>
          <LayoutCard id="lucid" name="LUC1D" hint="Sidebar, browser tabs and quick fade-in apps." onPick={onPick}>
            <div className="mb-4 flex h-28 gap-2 rounded-[var(--radius-control)] border border-border bg-card p-2.5">
              <div className="w-5 rounded-md bg-secondary" />
              <div className="flex-1 rounded-md bg-secondary/60" />
            </div>
          </LayoutCard>
          <LayoutCard id="ps5" name="PS5 style" hint="Console tile row, big spotlight and zoom-open apps." onPick={onPick}>
            <div className="mb-4 flex h-28 flex-col justify-between rounded-[var(--radius-control)] border border-border bg-card p-2.5">
              <div className="flex items-end gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`rounded-md bg-secondary ${i === 0 ? "size-7" : "size-5"}`} />
                ))}
              </div>
              <div className="h-3 w-24 rounded bg-primary/60" />
            </div>
          </LayoutCard>
        </div>
      </div>
    </div>
  );
}

function LayoutCard({
  id,
  name,
  hint,
  onPick,
  children,
}: {
  id: PickedLayout;
  name: string;
  hint: string;
  onPick: (layout: PickedLayout) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      className="surface-card lift press rounded-[var(--radius-card)] p-5 text-left focus-visible:outline-2 focus-visible:outline-ring hover:bg-accent/40"
    >
      {children}
      <div className="text-title font-semibold tracking-tight text-foreground">{name}</div>
      <div className="mt-0.5 text-caption text-muted-foreground">{hint}</div>
    </button>
  );
}
