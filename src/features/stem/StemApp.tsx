import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Play, SearchX } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/kit";
import { GAMES, GAME_SOURCES, type GameEntry, type GameSource, searchGames } from "./games";
import { GameCard } from "./GameCard";
import { PagedGrid } from "./GameGrid";
import { UnavailableNote } from "./GameNotice";
import { LibraryToolbar, SourceTabs } from "./LibraryControls";

const TICK_MS = 180;

/** The game store. Download installs a game to the account; Play opens it in a game window. */
export default function StemApp({ shell }: AppProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<GameSource>("55gms");
  // Progress percentage per game id while a download is in flight.
  const [progress, setProgress] = useState<Record<string, number>>({});
  const timers = useRef(new Map<string, number>());

  const installed = useMemo(() => new Set(shell.installedGames), [shell.installedGames]);
  const matches = useMemo(() => searchGames(GAMES, query), [query]);
  const counts = useMemo(() => {
    const out = {} as Record<GameSource, number>;
    for (const s of GAME_SOURCES) out[s.id] = matches.filter((g) => g.source === s.id).length;
    return out;
  }, [matches]);
  const shown = useMemo(() => matches.filter((g) => g.source === source), [matches, source]);

  // Stop any download timers when the store closes.
  useEffect(() => {
    const running = timers.current;
    return () => {
      running.forEach((timer) => window.clearInterval(timer));
      running.clear();
    };
  }, []);

  const download = (game: GameEntry) => {
    if (timers.current.has(game.id) || installed.has(game.id)) return;
    let value = 0;
    setProgress((s) => ({ ...s, [game.id]: 0 }));
    const timer = window.setInterval(() => {
      value = Math.min(100, value + Math.random() * 12 + 4);
      setProgress((s) => ({ ...s, [game.id]: value }));
      if (value < 100) return;
      window.clearInterval(timer);
      timers.current.delete(game.id);
      shell.installGame(game.id).then(
        () => shell.toast(`${game.name} installed.`, "success"),
        (err: unknown) => shell.toast(`Could not install ${game.name}. ${err instanceof Error ? err.message : "Try again."}`, "error"),
      ).finally(() => {
        setProgress((s) => {
          const next = { ...s };
          delete next[game.id];
          return next;
        });
      });
    }, TICK_MS);
    timers.current.set(game.id, timer);
  };

  const play = (game: GameEntry) => shell.openApp("game", { gameId: game.id, name: game.name });

  const countText = query
    ? `${matches.length} of ${GAMES.length} shown`
    : `${GAMES.length} games`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-stem p-4 sm:p-5">
      <LibraryToolbar
        title="Stem"
        count={countText}
        query={query}
        onQuery={setQuery}
        placeholder="Search games…"
      />
      <SourceTabs
        label="Store game source"
        value={source}
        counts={query ? counts : undefined}
        onChange={setSource}
      />

      <div className="min-h-0 flex-1 overflow-auto pr-1" role="tabpanel">
        {shown.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={query ? `No games match "${query}".` : "No games in this source yet."}
            action={
              query ? (
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              ) : undefined
            }
          >
            {query ? "Try a shorter word, or clear the search to see everything." : "Check back soon, or try another source."}
          </EmptyState>
        ) : (
          <PagedGrid
            key={`${source}:${query}`}
            items={shown}
            renderCard={(game) => {
              const owned = installed.has(game.id);
              const p = progress[game.id];
              return (
                <GameCard game={game} installed={owned}>
                  {game.unavailable ? (
                    <UnavailableNote game={game} />
                  ) : p !== undefined ? (
                    <div className="space-y-1.5">
                      <div
                        role="progressbar"
                        aria-label={`Downloading ${game.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.floor(p)}
                        className="h-2 overflow-hidden rounded-full bg-muted shadow-[var(--surface-highlight)]"
                      >
                        <div className="h-full rounded-full bg-primary shadow-accent transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${p}%` }} />
                      </div>
                      <p className="text-caption text-muted-foreground">
                        {p >= 100 ? "Saving…" : `Downloading… ${Math.floor(p)}%`}
                      </p>
                    </div>
                  ) : owned ? (
                    <Button className="w-full" onClick={() => play(game)}>
                      <Play /> Play
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => download(game)}>
                      <Download /> Download
                    </Button>
                  )}
                </GameCard>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
