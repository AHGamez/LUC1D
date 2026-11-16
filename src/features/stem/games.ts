import catalogue from "../../data/game-catalogue.json";
import gnMathCatalogue from "../../data/gn-math-catalogue.json";
import fiveplayCatalogue from "../../data/fiveplay-catalogue.json";
import bigGames from "../../data/big-games.json";

export const GAME_SOURCES = [
  { id: "55gms", name: "55gms", domain: "55gms.com" },
  { id: "gn-math", name: "GN Math", domain: "gn-math.dev" },
  { id: "fiveplay", name: "FivePlay", domain: "v2.fiveplay.lol" },
] as const;

export type GameSource = (typeof GAME_SOURCES)[number]["id"];

export interface GameEntry {
  id: string;
  name: string;
  /** The game's page on its source site. Used for the "Open on ..." fallback. */
  url: string;
  /** Where the game loads from: a copy under /game-files, or the hosted launcher for FivePlay. */
  embedUrl: string;
  source: GameSource;
  emoji: string;
  desc: string;
  /** Launch file too large for this site. Shown as unavailable and never framed. */
  unavailable: boolean;
}

// Oversized launch files were hosted outside this repo. Their keys are listed here, so they cannot run locally.
const OVERSIZED = new Set(Object.keys(bigGames));

const localPath = (key: string) => `/game-files/${key}`;

const fromFiftyFiveGms: GameEntry[] = catalogue.map((game) => {
  const link = new URL(game.url).searchParams.get("link") ?? "";
  const [base = "", query] = link.split("?");
  const entry = base.includes(".html") ? base : `${base.replace(/\/$/, "")}/index.html`;
  const key = `55gms/${entry}`;
  return {
    id: game.id,
    name: game.name,
    url: game.url,
    embedUrl: `${localPath(key)}${query ? `?${query}` : ""}`,
    source: "55gms",
    emoji: "🎮",
    desc: game.author ? `By ${game.author}` : "55gms",
    unavailable: OVERSIZED.has(key),
  };
});

const fromGnMath: GameEntry[] = gnMathCatalogue.map((game) => {
  const file = (game.embedUrl.split(/[?#]/)[0] ?? "").split("/").pop() || "index.html";
  const key = `gn-math/${file}`;
  return {
    id: game.id,
    name: game.name,
    url: game.url,
    embedUrl: localPath(key),
    source: "gn-math",
    emoji: "🎮",
    desc: game.author ? `By ${game.author}` : "GN Math",
    unavailable: OVERSIZED.has(key),
  };
});

const fromFivePlay: GameEntry[] = fiveplayCatalogue.map((game) => ({
  id: game.id,
  name: game.name,
  url: game.url,
  embedUrl: game.embedUrl,
  source: "fiveplay",
  emoji: "🕹️",
  desc: game.author ? `By ${game.author}` : "FivePlay",
  unavailable: false,
}));

/** Every game in the store. Ids are unique across sources; new sources use namespaced ids. */
export const GAMES: GameEntry[] = [...fromFiftyFiveGms, ...fromGnMath, ...fromFivePlay];

const BY_ID = new Map(GAMES.map((game) => [game.id, game]));

export function findGame(id: string): GameEntry | undefined {
  return BY_ID.get(id);
}

export function sourceInfo(id: GameSource) {
  return GAME_SOURCES.find((source) => source.id === id) ?? GAME_SOURCES[0];
}

export function gamesForSource(games: GameEntry[], source: GameSource): GameEntry[] {
  return games.filter((game) => game.source === source);
}

/** Every word typed must appear in the game's name or credit line. */
export function searchGames(games: GameEntry[], query: string): GameEntry[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return games;
  return games.filter((game) => {
    const haystack = `${game.name} ${game.desc}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
