import type { ComponentType } from "react";
import type { Prefs } from "../lib/prefs";
import type { SessionState } from "../lib/session";

/** One open window. `id` is unique among open windows; `title` and `icon` show in tabs and titlebars. */
export interface WindowItem {
  id: string;
  appId: string;
  title: string;
  icon: string;
  payload?: unknown;
}

/** What the shell gives every app. Apps never reach into shell internals directly. */
export interface ShellApi {
  prefs: Prefs;
  updatePrefs(patch: Partial<Prefs>): void;
  resetPrefs(): void;
  /** Opens an app in a window, or focuses it if it is already open. */
  openApp(appId: string, payload?: unknown): void;
  /** Closes a window by its id. */
  closeWindow(windowId: string): void;
  toast(text: string, kind?: "info" | "success" | "error"): void;
  /** Games the signed-in user has installed. */
  installedGames: string[];
  /** Records an install on the backend. Resolves when saved. */
  installGame(gameId: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface AppProps {
  windowId: string;
  payload: unknown;
  shell: ShellApi;
  session: SessionState;
}

/** A desktop app. Its component is loaded on first open, so each app is its own chunk. */
export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  /** Shown in the sidebar and PS5 tile row. */
  dock: boolean;
  /** Derive the window id. Defaults to the app id, so an app opens at most once. */
  windowKey?: (payload: unknown) => string;
  /** Title for a given payload, e.g. a game's name. */
  windowTitle?: (payload: unknown) => string;
  load: () => Promise<{ default: ComponentType<AppProps> }>;
}
