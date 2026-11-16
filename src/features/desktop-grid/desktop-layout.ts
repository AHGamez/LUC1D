import type { Zone } from "./desktop-grid";

/**
 * Apps that live as shortcuts on the LUC1D desktop grid (drag them anywhere on the grid).
 * The Sidebar and the app bar leave these out, as the reference desktop does.
 */
export const DESKTOP_APP_IDS = ["discard", "stem", "tikitaki"] as const;

/**
 * Reserved areas of the LUC1D home (fractions of the desktop). Shortcuts can't be dropped here:
 * the centre column holds the glass wordmark, the update log and the other home content.
 */
export const HOME_ZONES: Zone[] = [{ x0: 0.2, y0: 0, x1: 0.8, y1: 1 }];
