import Stripe from "stripe";
import { DONATION_MAX_CENTS, DONATION_MIN_CENTS, DONOR_REWARD_CENTS, DONOR_TAG } from "../../src/features/donate/donation-rules";
import { authenticate, json, readJsonObject, readSupabaseEnv } from "./supabaseAuth";

/*
 * POST /api/donations/claim. Body: { "sessionId": "cs_..." }. Header: Authorization: Bearer <access token>.
 *
 * Records a paid donation Checkout session once. The session is re-read from Stripe; its payment status,
 * currency, amount and metadata.userId are checked here. The reward itself is one database transaction
 * (donation_claim_reward, migration 0078): the claim row, the donor tag and the wallet credit all happen,
 * or none do. Running the same session twice returns ok with fresh: false and adds nothing.
 *
 * Environment (server only): STRIPE_SECRET_KEY, plus the Supabase variables read by supabaseAuth.ts.
 */

const CS_ID = /^cs_[a-zA-Z0-9_]+$/;

export async function handleDonationClaim(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const env = readSupabaseEnv();
  const stripeKey = process.env["STRIPE_SECRET_KEY"]?.trim();
  if (!env || !stripeKey) return json({ error: "Donations are not configured on this server" }, 503);

  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;

  const body = await readJsonObject(request);
  const sessionId = body?.["sessionId"];
  if (typeof sessionId !== "string" || !CS_ID.test(sessionId)) return json({ error: "Bad session" }, 400);

  const stripe = new Stripe(stripeKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return json({ error: "Could not check the donation" }, 502);
  }
  if (session.payment_status !== "paid") return json({ error: "Payment not finished" }, 402);
  if (session.metadata?.["userId"] !== auth.userId) return json({ error: "This donation isn't yours" }, 403);
  const cents = session.amount_total ?? 0;
  if (session.currency !== "usd" || cents < DONATION_MIN_CENTS || cents > DONATION_MAX_CENTS) {
    return json({ error: "Unexpected donation amount" }, 400);
  }

  const { data: fresh, error } = await auth.admin.rpc("donation_claim_reward", {
    _session_id: session.id,
    _user_id: auth.userId,
    _cents: cents,
    _reward_cents: DONOR_REWARD_CENTS,
    _tag: DONOR_TAG,
  });
  if (error) {
    console.error(`[donations] reward failed: ${error.message}`);
    return json({ error: "Could not add your reward. Please try again." }, 500);
  }
  return json({ ok: true, fresh: fresh === true, rewardCents: fresh === true ? DONOR_REWARD_CENTS : 0 }, 200);
}
