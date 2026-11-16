import { useMemo, useState } from "react";
import { Library, Play, SearchX } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/kit";
import { GameCard } from "../stem/GameCard";
import { PagedGrid } from "../stem/GameGrid";
import { UnavailableNote } from "../stem/GameNotice";
import { LibraryToolbar, SourceTabs } from "../stem/LibraryControls";
import { GAMES, GAME_SOURCES, type GameEntry, type GameSource, gamesForSource, searchGames } from "../stem/games";

/** Games the account has installed, grouped by source. Play opens each one in a game window. */
export default function DownloadsApp({ shell }: AppProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<GameSource>("55gms");

  const owned = useMemo(() => {
    const ids = new Set(shell.installedGames);
    return GAMES.filter((game) => ids.has(game.id));
  }, [shell.installedGames]);

  const matches = useMemo(() => searchGames(owned, query), [owned, query]);
  const counts = useMemo(() => {
    const out = {} as Record<GameSource, number>;
    for (const s of GAME_SOURCES) out[s.id] = matches.filter((g) => g.source === s.id).length;
    return out;
  }, [matches]);
  const shown = useMemo(() => gamesForSource(matches, source), [matches, source]);

  const play = (game: GameEntry) => shell.openApp("game", { gameId: game.id, name: game.name });

  const countText = query
    ? `${matches.length} of ${owned.length} shown`
    : `${owned.length} game${owned.length === 1 ? "" : "s"} installed`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-stem p-4 sm:p-5">
      <LibraryToolbar
        title="Downloads"
        count={countText}
        query={query}
        onQuery={setQuery}
        placeholder="Search downloads…"
      />
      <SourceTabs label="Downloads game source" value={source} counts={counts} onChange={setSource} />

      <div className="min-h-0 flex-1 overflow-auto pr-1" role="tabpanel">
        {shown.length === 0 ? (
          query ? (
            <EmptyState
              icon={<SearchX />}
              title={`No downloads match "${query}".`}
              action={
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            >
              Try a shorter word, or clear the search.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<Library />}
              title={`No ${GAME_SOURCES.find((s) => s.id === source)?.name ?? ""} downloads yet.`}
              action={<Button onClick={() => shell.openApp("stem")}>Get games in Stem</Button>}
            >
              Games you install from the Stem store show up here.
            </EmptyState>
          )
        ) : (
          <PagedGrid
            key={`${source}:${query}`}
            items={shown}
            renderCard={(game) => (
              <GameCard game={game} installed>
                {game.unavailable ? (
                  <UnavailableNote game={game} />
                ) : (
                  <Button className="w-full" onClick={() => play(game)}>
                    <Play /> Play
                  </Button>
                )}
              </GameCard>
            )}
          />
        )}
      </div>
    </div>
  );
}
