import { describe, expect, it } from "vitest";
import { GAMES, findGame, gamesForSource, searchGames, GAME_SOURCES } from "./games";

describe("game catalogue", () => {
  it("loads games from the bundled catalogues", () => {
    expect(GAMES.length).toBeGreaterThan(100);
  });

  it("finds a game by id and returns undefined for an unknown one", () => {
    const first = GAMES[0];
    expect(findGame(first.id)?.id).toBe(first.id);
    expect(findGame("definitely-not-a-game")).toBeUndefined();
  });

  it("keeps every game in a known source", () => {
    const known = new Set<string>(GAME_SOURCES.map((s) => s.id));
    for (const g of GAMES) expect(known.has(g.source)).toBe(true);
  });

  it("filters by source", () => {
    const src = GAME_SOURCES[0].id;
    const subset = gamesForSource(GAMES, src);
    expect(subset.every((g) => g.source === src)).toBe(true);
  });

  it("searches case-insensitively and returns everything for an empty query", () => {
    expect(searchGames(GAMES, "")).toHaveLength(GAMES.length);
    const name = GAMES[0].name.split(" ")[0];
    const hits = searchGames(GAMES, name.toUpperCase());
    expect(hits.some((g) => g.id === GAMES[0].id)).toBe(true);
  });
});
