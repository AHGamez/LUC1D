import type { AppDefinition } from "./types";

// Every app is loaded lazily. Adding an app: create its folder under src/features/, then add an entry here.
export const APPS: AppDefinition[] = [
  {
    id: "stem",
    title: "Stem",
    icon: "🎮",
    dock: true,
    load: () => import("../features/stem/StemApp"),
  },
  {
    id: "game",
    title: "Game",
    icon: "🕹️",
    dock: false,
    windowKey: (p) => `game:${(p as { gameId: string }).gameId}`,
    windowTitle: (p) => (p as { name?: string }).name ?? "Game",
    load: () => import("../features/stem/GameWindow"),
  },
  {
    id: "downloads",
    title: "Downloads",
    icon: "📚",
    dock: true,
    load: () => import("../features/downloads/DownloadsApp"),
  },
  {
    id: "discard",
    title: "Discard",
    icon: "💬",
    dock: true,
    load: () => import("../features/discard/DiscardApp"),
  },
  {
    id: "tikitaki",
    title: "TikiTaki",
    icon: "🎵",
    dock: true,
    load: () => import("../features/tikitaki/TikiTakiApp"),
  },
  {
    id: "larpflex",
    title: "Larp Flex",
    icon: "⚔️",
    dock: true,
    load: () => import("../features/larpflex/LarpFlexApp"),
  },
  {
    id: "clubbird",
    title: "Club Bird",
    icon: "🐦",
    dock: true,
    load: () => import("../features/clubbird/ClubBirdApp"),
  },
  {
    id: "pass",
    title: "Battle Pass",
    icon: "🎟️",
    dock: true,
    load: () => import("../features/pass/BattlePassApp"),
  },
  {
    id: "grime",
    title: "Grime Video",
    icon: "🍿",
    dock: true,
    load: () => import("../features/longform/GrimeApp"),
  },
  {
    id: "tube",
    title: "Tube For You",
    icon: "▶️",
    dock: true,
    load: () => import("../features/longform/TubeApp"),
  },
  {
    id: "video",
    title: "Video Maker",
    icon: "🎬",
    dock: true,
    load: () => import("../features/video/VideoMakerApp"),
  },
  {
    id: "music",
    title: "Music",
    icon: "🎧",
    dock: true,
    load: () => import("../features/music/MusicApp"),
  },
  {
    id: "donate",
    title: "Donate",
    icon: "💖",
    dock: true,
    load: () => import("../features/donate/DonateApp"),
  },
  {
    id: "settings",
    title: "Settings",
    icon: "⚙️",
    dock: true,
    load: () => import("../features/settings/SettingsApp"),
  },
  {
    id: "turkey",
    title: "Turkey Hunt",
    icon: "🦃",
    dock: false,
    load: () => import("../features/turkey/TurkeyHuntApp"),
  },
  {
    id: "lublox",
    title: "Lublox",
    icon: "◈",
    dock: true,
    load: () => import("../features/lublox/LubloxApp"),
  },
  {
    id: "lublox-studio",
    title: "Lublox Studio",
    icon: "🛠️",
    dock: true,
    load: () => import("../features/studio/StudioApp"),
  },
  {
    id: "lounge",
    title: "AFK Lounge",
    icon: "☕",
    dock: true,
    load: () => import("../features/lounge/LoungeApp"),
  },
  {
    id: "advertise",
    title: "Advertise",
    icon: "📣",
    dock: true,
    load: () => import("../features/site/Advertise"),
  },
];

export function findApp(id: string) {
  return APPS.find((a) => a.id === id);
}
