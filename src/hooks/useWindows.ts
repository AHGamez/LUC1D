import { useCallback, useState } from "react";
import { findApp } from "../apps/registry";
import type { WindowItem } from "../apps/types";

/** Open windows, in tab order, and which one is in front. `activeId` null means Home is showing. */
export function useWindows() {
  const [wins, setWins] = useState<WindowItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const openApp = useCallback((appId: string, payload?: unknown) => {
    const app = findApp(appId);
    if (!app) return;
    const id = app.windowKey ? app.windowKey(payload) : app.id;
    const title = app.windowTitle ? app.windowTitle(payload) : app.title;
    setWins((ws) => (ws.some((w) => w.id === id) ? ws : [...ws, { id, appId, title, icon: app.icon, payload }]));
    setActiveId(id);
  }, []);

  const close = useCallback((id: string) => {
    setWins((ws) => ws.filter((w) => w.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const focus = useCallback((id: string | null) => setActiveId(id), []);

  const active = wins.find((w) => w.id === activeId) ?? null;

  return { wins, active, openApp, close, focus };
}
