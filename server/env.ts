import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface ServerEnv {
  port: number;
  /** Secret API key (sk_test_… / sk_live_… or a restricted rk_ key). Optional: without it donations are disabled. */
  stripeSecretKey: string | undefined;
  /** Signing secret for the Stripe webhook endpoint (whsec_…). Optional until webhooks are used. */
  stripeWebhookSecret: string | undefined;
  /** Public origin of the built site, e.g. https://example.com. Used for Checkout return URLs. */
  publicSiteUrl: string | undefined;
  /** Extra origin allowed to call the API cross-origin, e.g. http://localhost:5173 in development. */
  allowedOrigin: string | undefined;
}

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readOrigin(name: string): string | undefined {
  const value = read(name);
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be a full URL such as https://example.com`);
  }
}

/**
 * Reads and validates the server configuration. Throws with a readable message when a required
 * variable is missing, so the server refuses to start instead of failing on the first request.
 * Variable values are never included in error messages.
 */
export function loadEnv(): ServerEnv {
  // Node loads .env.local itself (no dotenv needed). Variables already set in the shell win.
  const envFile = resolve(process.cwd(), ".env.local");
  if (existsSync(envFile) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envFile);
  }

  const stripeSecretKey = read("STRIPE_SECRET_KEY");
  if (stripeSecretKey && !/^(sk|rk)_(test|live)_/.test(stripeSecretKey)) {
    throw new Error("STRIPE_SECRET_KEY does not look like a Stripe secret key (expected sk_test_… or sk_live_…).");
  }

  const rawPort = read("PORT") ?? "8787";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return {
    port,
    stripeSecretKey,
    stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
    publicSiteUrl: readOrigin("PUBLIC_SITE_URL"),
    allowedOrigin: readOrigin("ALLOWED_ORIGIN"),
  };
}
