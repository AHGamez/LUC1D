import { useSyncExternalStore } from "react";

export type DeviceMode = "mobile" | "computer";

/** Fired on window when a device is chosen. Kept for listeners written against the original app. */
export const DEVICE_EVENT = "luc1d-device";

// Held in memory only: the device is asked again on every startup, so nothing is persisted.
let chosen: DeviceMode | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Records the device for this page load. Pass null to ask again. */
export function setDeviceMode(mode: DeviceMode | null): void {
  chosen = mode;
  if (typeof document !== "undefined") {
    if (mode) document.documentElement.dataset["deviceMode"] = mode;
    else delete document.documentElement.dataset["deviceMode"];
  }
  if (typeof window !== "undefined" && mode) {
    window.dispatchEvent(new CustomEvent<DeviceMode>(DEVICE_EVENT, { detail: mode }));
  }
  listeners.forEach((l) => l());
}

export interface DeviceModeState {
  /** The chosen device. "computer" until the user picks, so layouts have a sensible default. */
  mode: DeviceMode;
  /** False until the user has picked a device this page load. DeviceEntry shows while this is false. */
  chosen: boolean;
  /** True on mobile: skip blur, drifting, twinkle and leaf effects to save battery. */
  reduceEffects: boolean;
}

/** The device chosen this page load, and whether effects should be reduced. */
export function useDeviceMode(): DeviceModeState {
  const mode = useSyncExternalStore(subscribe, () => chosen, () => null);
  const resolved: DeviceMode = mode ?? "computer";
  return { mode: resolved, chosen: mode !== null, reduceEffects: resolved === "mobile" };
}
