import Stripe from "stripe";
import { AD_CARD_CENTS, AD_MAX_CHARS, AD_SLOTS } from "../../src/features/site/ad-rules";
import { authenticate, json, readJsonObject, readSupabaseEnv } from "./supabaseAuth";

/*
 * Site ads. The ad_slots table and its storage bucket are owner-only to read (migration 0077), so the
 * public board is served from here with the service-role client. Routes (see server/index.ts):
 *   GET  /api/ads            list all slots with signed picture links (signed in)
 *   POST /api/ads/checkout   start a $1 card checkout for one slot
 *   POST /api/ads/claim      record a paid card checkout as the slot's ad
 * Discard-money purchases go straight to the ad_buy_coins database function from the browser.
 *
 * Environment (server only): STRIPE_SECRET_KEY, PUBLIC_SITE_URL (for Checkout return links).
 */

const AD_PRODUCT = "LUC1D ad slot";
const CHECKOUT_ERROR = "Could not start checkout. Please try again.";
const CS_ID = /^cs_[a-zA-Z0-9_]+$/;

function stripeClient(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"]?.trim();
  return key ? new Stripe(key) : null;
}

function siteOrigin(): string | null {
  const raw = process.env["PUBLIC_SITE_URL"]?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export async function handleAdsList(request: Request): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const env = readSupabaseEnv();
  if (!env) return json({ error: "Ads are not configured" }, 503);
  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin.from("ad_slots").select("slot, body, image_path");
  if (error) return json({ error: "Could not load ads" }, 500);
  const rows = data ?? [];

  const urls = new Map<string, string>();
  const paths = rows.map((r) => r.image_path).filter(Boolean);
  if (paths.length) {
    const { data: signed, error: signError } = await auth.admin.storage.from("site-ads").createSignedUrls(paths, 3600);
    if (!signError) for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  return json(
    {
      slots: AD_SLOTS,
      ads: rows.map((r) => ({ slot: r.slot, body: r.body, imageUrl: urls.get(r.image_path) ?? null })),
    },
    200,
  );
}

export async function handleAdCheckout(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const env = readSupabaseEnv();
  if (!env) return json({ error: "Ads are not configured" }, 503);
  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;

  const body = await readJsonObject(request);
  const slot = body?.["slot"];
  const text = typeof body?.["body"] === "string" ? body["body"].trim() : "";
  const image = body?.["image"];
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > AD_SLOTS) {
    return json({ error: `Pick a slot from 1 to ${AD_SLOTS}` }, 400);
  }
  if (text.length < 1 || text.length > AD_MAX_CHARS) return json({ error: `Text must be 1-${AD_MAX_CHARS} characters` }, 400);
  // Only a picture the caller uploaded into their own folder can be used.
  if (typeof image !== "string" || !image.includes("/") || image.split("/")[0] !== auth.userId) {
    return json({ error: "Upload a picture first" }, 400);
  }

  const { data: taken, error: takenError } = await auth.admin.from("ad_slots").select("slot").eq("slot", slot).maybeSingle();
  if (takenError) return json({ error: "Could not check the slot" }, 500);
  if (taken) return json({ error: "That slot is taken" }, 409);

  const origin = siteOrigin();
  const stripe = stripeClient();
  if (!origin || !stripe) return json({ error: "Ads are not configured" }, 503);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "usd", unit_amount: AD_CARD_CENTS, product_data: { name: AD_PRODUCT } },
        },
      ],
      payment_intent_data: { description: AD_PRODUCT },
      success_url: `${origin}/?ad=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?ad=cancelled`,
      metadata: { userId: auth.userId, slot: String(slot), body: text, image },
    });
    if (!session.url) return json({ error: CHECKOUT_ERROR }, 502);
    return json({ url: session.url }, 200);
  } catch (err) {
    console.error(`[ads] checkout failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ error: CHECKOUT_ERROR }, 502);
  }
}

export async function handleAdClaim(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const env = readSupabaseEnv();
  if (!env) return json({ error: "Ads are not configured" }, 503);
  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;

  const body = await readJsonObject(request);
  const sessionId = body?.["sessionId"];
  if (typeof sessionId !== "string" || !CS_ID.test(sessionId)) return json({ error: "Bad session" }, 400);

  const stripe = stripeClient();
  if (!stripe) return json({ error: "Ads are not configured" }, 503);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return json({ error: "Could not check the payment" }, 502);
  }
  if (session.payment_status !== "paid") return json({ error: "Payment not finished" }, 402);
  const meta = session.metadata ?? {};
  if (meta["userId"] !== auth.userId) return json({ error: "This payment isn't yours" }, 403);
  if (session.currency !== "usd" || session.amount_total !== AD_CARD_CENTS) {
    return json({ error: "Unexpected payment amount" }, 400);
  }

  const { error } = await auth.admin.from("ad_slots").insert({
    slot: Number(meta["slot"]),
    user_id: auth.userId,
    body: meta["body"] ?? "",
    image_path: meta["image"] ?? "",
    paid_with: "card",
    stripe_session: session.id,
  });
  if (error) {
    // The same session may already be claimed (a refresh on the return page). That is not an error.
    const { data: mine } = await auth.admin.from("ad_slots").select("slot").eq("stripe_session", session.id).maybeSingle();
    if (mine) return json({ ok: true, fresh: false }, 200);
    return json({ error: "That slot was taken while you paid. Contact staff for a refund." }, 409);
  }
  return json({ ok: true, fresh: true }, 200);
}
