/** Ad slot rules shared by the Advertise app and the server handler. Client-safe: no server imports. */

/** Number of paid slots on the Advertise board. */
export const AD_SLOTS = 100;
/** Longest ad text, in characters. Matches the ad_slots check constraint. */
export const AD_MAX_CHARS = 100;
/** Card price for one slot, in US cents ($1). */
export const AD_CARD_CENTS = 100;
/** Discard money price for one slot, in cents ($5,000). Charged by the ad_buy_coins database function. */
export const AD_COIN_CENTS = 500000;
/** Picture types accepted for an ad. */
export const AD_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
