import type { ReactNode } from "react";
import { AppTile } from "../../components/ui/AppTile";
import { Badge } from "../../components/ui/kit";
import { type GameEntry, type GameSource, sourceInfo } from "./games";

/** Each catalogue has its own tile colour, so the grid reads by source at a glance. */
const SOURCE_TINT: Record<GameSource, string> = {
  "55gms": "var(--app-stem)",
  "gn-math": "var(--app-tikitaki)",
  fiveplay: "var(--app-longform)",
};

/** One game tile. The caller supplies the action row (download, play, unavailable note). */
export function GameCard({ game, installed, children }: { game: GameEntry; installed: boolean; children: ReactNode }) {
  return (
    <article className="lucid-card surface-card lift flex flex-col gap-3.5 p-4">
      <div className="flex items-start gap-3.5">
        <AppTile tint={SOURCE_TINT[game.source]} size="lg" className="text-[1.75rem]">
          {game.emoji}
        </AppTile>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="break-words text-body font-semibold tracking-tight text-foreground">{game.name}</h3>
          <p className="mt-0.5 text-caption text-muted-foreground">{sourceInfo(game.source).domain} · Free</p>
        </div>
        {installed && <Badge tone="success">Installed</Badge>}
      </div>
      <p className="line-clamp-2 text-caption leading-relaxed text-muted-foreground">{game.desc}</p>
      <div className="mt-auto">{children}</div>
    </article>
  );
}
