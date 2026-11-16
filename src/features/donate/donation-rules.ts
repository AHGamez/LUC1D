/** Donation rules shared by the Donate app and the server handlers. Client-safe: no server imports. */

/** Smallest and largest donation, in US cents. Whole dollars only. */
export const DONATION_MIN_CENTS = 100;
export const DONATION_MAX_CENTS = 3000;
/** Discard money credited with each donation ($500). */
export const DONOR_REWARD_CENTS = 50000;
/** Chat tag given with each donation. */
export const DONOR_TAG = "tag-donater";
