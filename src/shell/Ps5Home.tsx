import { useEffect, useState, type CSSProperties } from "react";
import { LogOut, Play } from "lucide-react";
import { appTint } from "../components/ui/AppTile";
import { Button } from "../components/ui/Button";
import { useClock } from "../hooks/useClock";
import type { AppDefinition } from "../apps/types";

interface Ps5HomeProps {
  tiles: AppDefinition[];
  onOpen: (appId: string) => void;
  onSignOut: () => void;
  clock24: boolean;
}

/** Console-style home: a tile row with a spotlight on the selected tile. Arrow keys move, Enter opens. */
export function Ps5Home({ tiles, onOpen, onSignOut, clock24 }: Ps5HomeProps) {
  const [sel, setSel] = useState(0);
  const time = useClock(clock24);
  const current = tiles[sel] ?? tiles[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowRight") setSel((s) => Math.min(tiles.length - 1, s + 1));
      else if (e.key === "ArrowLeft") setSel((s) => Math.max(0, s - 1));
      else if (e.key === "Enter" && document.activeElement === document.body && tiles[sel]) onOpen(tiles[sel].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tiles, sel, onOpen]);

  if (!current) return null;

  return (
    <div className="relative z-10 flex h-full flex-col px-8 pt-6">
      <div className="flex items-center gap-2 text-body">
        <span className="shell-glass rounded-full border px-4 py-1 font-semibold text-foreground">Apps</span>
        <span className="ml-auto flex items-center gap-4 text-foreground">
          <time className="tabular-nums">{time}</time>
          <button
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
          >
            <LogOut className="size-4" />
          </button>
        </span>
      </div>

      <div role="group" aria-label="App tiles" className="mt-6 flex items-end gap-3 overflow-x-auto pb-6 pt-2">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            title={t.title}
            aria-label={t.title}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
            onClick={() => onOpen(t.id)}
            style={{ "--tile": appTint(t.id) } as CSSProperties}
            className={`app-tile press flex shrink-0 items-center justify-center rounded-[22px] transition-all duration-300 ${
              sel === i
                ? "size-24 text-4xl ring-2 ring-foreground/50 ring-offset-2 ring-offset-background"
                : "size-16 text-2xl opacity-75 hover:opacity-100"
            }`}
          >
            <span aria-hidden>{t.icon}</span>
          </button>
        ))}
      </div>

      <div key={current.id} className="ps5-hero mt-[8vh] max-w-xl">
        <div className="text-caption tracking-[0.3em] text-muted-foreground uppercase">LUC1D reborn</div>
        <h1 className="mt-2 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">{current.title}</h1>
        <Button onClick={() => onOpen(current.id)} size="lg" className="mt-6 rounded-full px-8">
          <Play /> Open
        </Button>
      </div>
    </div>
  );
}
