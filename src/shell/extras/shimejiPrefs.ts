import { useSyncExternalStore } from "react";

/*
 * Per-pet switches for walking Shimejis. Kept per browser in localStorage and separate from the
 * desktop prefs so the walkers and the Settings app read the same store. Other tabs stay in sync.
 */
const KEY = "luc1d-shimeji-prefs";

interface ShimejiState {
  /** Shimeji ids the user has switched off. Everything owned and not listed here is shown. */
  disabled: string[];
}

function read(): ShimejiState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as { disabled?: unknown };
    const disabled = Array.isArray(saved.disabled) ? saved.disabled.filter((id): id is string => typeof id === "string") : [];
    return { disabled };
  } catch {
    return { disabled: [] };
  }
}

let state: ShimejiState = read();
const listeners = new Set<() => void>();

function commit(next: ShimejiState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or disabled: keep the in-memory switches */
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = read();
    notify();
  };
  listeners.add(notify);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => state;

/** Switched-off Shimeji ids, read without React. Used by the walkers' animation loop. */
export function getDisabledPets(): string[] {
  return state.disabled;
}

/** Turns one Shimeji on or off. Takes effect on the tab bar straight away. */
export function setPetEnabled(id: string, enabled: boolean) {
  const rest = state.disabled.filter((x) => x !== id);
  commit({ disabled: enabled ? rest : [...rest, id] });
}

/** Per-pet switch state for components. Re-renders when any switch changes, in any tab. */
export function useShimejiPrefs() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const disabledPets = snapshot.disabled;
  return {
    disabledPets,
    isPetEnabled: (id: string) => !disabledPets.includes(id),
    setPetEnabled,
  };
}
