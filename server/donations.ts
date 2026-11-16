import type Stripe from "stripe";
import { HttpError } from "./http.ts";

export const DONATION_MIN_CENTS = 100; // $1
export const DONATION_MAX_CENTS = 3000; // $30

const PRODUCT_NAME = "LUC1D reborn donation";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CheckoutRequest {
  amountCents: number;
  customerEmail: string | undefined;
}

/** Checks the client's request body. The amount is always re-validated here; the browser is never trusted. */
export function parseCheckoutInput(raw: unknown): CheckoutRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError(400, "Expected a JSON object");
  }
  const { amountCents, customerEmail } = raw as Record<string, unknown>;

  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) {
    throw new HttpError(400, "amountCents must be a number");
  }
  const amount = Math.round(amountCents);
  if (amount < DONATION_MIN_CENTS) throw new HttpError(400, "Donation must be at least $1");
  if (amount > DONATION_MAX_CENTS) throw new HttpError(400, "Donation cannot be more than $30");

  let email: string | undefined;
  if (customerEmail !== undefined && customerEmail !== null && customerEmail !== "") {
    if (typeof customerEmail !== "string") throw new HttpError(400, "customerEmail must be a string");
    const trimmed = customerEmail.trim();
    if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) {
      throw new HttpError(400, "customerEmail is not a valid email address");
    }
    email = trimmed;
  }

  return { amountCents: amount, customerEmail: email };
}

/**
 * Creates a hosted Stripe Checkout session for a one-off donation and returns its URL.
 * The browser redirects to that URL; no secret or client secret is returned.
 */
export async function createDonationCheckout(
  stripe: Stripe,
  siteOrigin: string,
  input: CheckoutRequest & { userId: string },
): Promise<{ url: string }> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: PRODUCT_NAME },
            unit_amount: input.amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { description: PRODUCT_NAME },
      // The claim handler re-reads this session and checks metadata.userId against the caller.
      metadata: { userId: input.userId },
      success_url: `${siteOrigin}/?donation=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteOrigin}/?donation=cancelled`,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
    });
  } catch (err) {
    // Stripe's message is logged for the operator; the browser gets a generic one.
    console.error(`[donations] Stripe checkout failed: ${err instanceof Error ? err.message : "unknown error"}`);
    throw new HttpError(502, "Could not start checkout. Please try again.");
  }

  if (!session.url) throw new HttpError(502, "Could not start checkout. Please try again.");
  return { url: session.url };
}

/** Verifies the Stripe signature over the raw body and records the event. Nothing is stored yet. */
export function handleStripeWebhook(
  stripe: Stripe,
  webhookSecret: string,
  rawBody: Buffer,
  signature: string | undefined,
): { received: true } {
  if (!signature) throw new HttpError(400, "Missing Stripe-Signature header");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new HttpError(400, "Invalid webhook signature");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log(`[webhook] ${event.id} ${event.type} amount_cents=${session.amount_total} currency=${session.currency}`);
    // Fulfilment (recording the donation) needs a storage table. The original app had none, so this
    // only logs until one is added.
  } else {
    console.log(`[webhook] ${event.id} ${event.type} (no action)`);
  }

  return { received: true };
}
