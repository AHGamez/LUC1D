import { ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { type GameEntry, sourceInfo } from "./games";

/** Explains why a game cannot run here and links to where it can be played. */
export function UnavailableNote({ game }: { game: GameEntry }) {
  const source = sourceInfo(game.source);
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-xs text-muted-foreground">
        This game is too large to host on LUC1D. Play it on {source.name} instead.
      </p>
      <Button variant="outline" size="sm" onClick={() => window.open(game.url, "_blank", "noopener,noreferrer")}>
        <ExternalLink /> Open on {source.name}
      </Button>
    </div>
  );
}
