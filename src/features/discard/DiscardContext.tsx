import { createContext, useContext } from "react";
import type { Profile } from "./lib/discard-types";
import type { Look } from "./lib/discard-look";

export interface DiscardContextValue {
  me: string;
  profiles: Record<string, Profile>;
  look: Look;
  /** Owner of Discard (verified "owner" tag). */
  siteOwner: boolean;
  /** Owner or moderator. Gates the admin menu and poll/announcement controls. */
  siteMod: boolean;
  /** Club Bird chat tags this user owns (bought, traded or given). */
  ownedTagIds: string[];
  /** Wears one of the owned chat tags. The database refuses tags you do not own. */
  wearTag(id: string): Promise<void>;
  toast(text: string, kind?: "info" | "success" | "error"): void;
  reloadProfiles(): void;
  /** Opens another desktop app, e.g. Club Bird. */
  openApp(appId: string): void;
  nameOf(id: string): string;
}

export const DiscardContext = createContext<DiscardContextValue | null>(null);

export function useDiscard(): DiscardContextValue {
  const ctx = useContext(DiscardContext);
  if (!ctx) throw new Error("useDiscard must be used inside <DiscardContext.Provider>");
  return ctx;
}

/** Corner radius for list items and bubbles, following the "rounded corners" look setting. */
export const radius = (look: Look) => (look.rounded ? "rounded-lg" : "rounded-none");
