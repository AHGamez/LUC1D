import type { AppProps } from "../../apps/types";
import { EmptyState } from "../../components/ui/kit";
import { findGame } from "./games";
import { HostedGame } from "./HostedGame";
import { UnavailableNote } from "./GameNotice";

/** Plays one game. Payload: { gameId: string, name?: string }. */
export default function GameWindow({ payload }: AppProps) {
  const gameId = (payload as { gameId?: unknown } | null | undefined)?.gameId;
  const game = typeof gameId === "string" ? findGame(gameId) : undefined;

  if (!game) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState title="This game could not be found.">
          The link may be out of date, or the game may have been removed from the catalogue.
        </EmptyState>
      </div>
    );
  }

  if (game.unavailable) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold text-foreground">{game.name}</p>
        <UnavailableNote game={game} />
      </div>
    );
  }

  return <HostedGame game={game} />;
}
