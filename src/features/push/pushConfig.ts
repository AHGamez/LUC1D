/**
 * VAPID public key. It is not a secret: the browser needs it to subscribe, and the server needs it
 * to sign pushes. The matching private key is only ever read from the VAPID_PRIVATE_KEY env var.
 */
export const VAPID_PUBLIC_KEY = "BOjQAIHvk5S16Md37UNTDZYTPvI-6qIpUugjf34JYmpF4sCu1lmtiiLRk4GFKjxUs3UbUhNcXLjxxjGSPkiuUg0";

/** Largest @everyone text the server accepts, in characters. */
export const EVERYONE_MAX_TEXT = 300;
/** Longest sender name shown in an @everyone notification. */
export const EVERYONE_MAX_SENDER = 60;
