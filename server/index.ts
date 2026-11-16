import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import Stripe from "stripe";
import { handleLarpJudge } from "./handlers/larpJudge.ts";
import { handleSendEveryonePush } from "./handlers/push.ts";
import { authenticate, readSupabaseEnv } from "./handlers/supabaseAuth.ts";
import { handleDeleteAccount } from "./handlers/accountAdmin.ts";
import { handleAdsList, handleAdCheckout, handleAdClaim } from "./handlers/ads.ts";
import { handleSiteAnnouncement } from "./handlers/siteAnnouncement.ts";
import { handleDonationClaim } from "./handlers/donationClaim.ts";
import { handleLubloxAi } from "./handlers/lubloxAi.ts";
import { loadEnv, type ServerEnv } from "./env.ts";
import {
  createDonationCheckout,
  handleStripeWebhook,
  parseCheckoutInput,
} from "./donations.ts";
import {
  HttpError,
  header,
  parseJson,
  readBody,
  requireJsonContentType,
  sendJson,
} from "./http.ts";

interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  env: ServerEnv;
  /** null when STRIPE_SECRET_KEY is not set: donation and webhook routes then return 503. */
  stripe: Stripe | null;
}

type Handler = (ctx: Ctx) => Promise<void>;

/** Hop-by-hop and framing headers that must not be copied from the node request to the web Request. */
const SKIPPED_REQUEST_HEADERS = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "expect", "host", "content-length"]);

/** The origin the browser is on, as seen by the server. Used to accept same-origin requests. */
function ownOrigin(req: IncomingMessage): string {
  const proto = header(req, "x-forwarded-proto") ?? ("encrypted" in req.socket ? "https" : "http");
  return `${proto}://${header(req, "host") ?? "localhost"}`;
}

/** Donations must come from the site itself or from an origin listed in the env. */
function resolveSiteOrigin({ req, env }: Ctx): string {
  const origin = header(req, "origin");
  if (!origin) throw new HttpError(403, "Donations must be started from the site");
  if (origin === ownOrigin(req) || origin === env.publicSiteUrl || origin === env.allowedOrigin) return origin;
  throw new HttpError(403, "Origin is not allowed");
}

/** Copies a node request into a web Request so web-standard handlers can use it. */
function toWebRequest(req: IncomingMessage, url: URL, body: Buffer): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || SKIPPED_REQUEST_HEADERS.has(name)) continue;
    if (Array.isArray(value)) for (const v of value) headers.append(name, v);
    else headers.set(name, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && body.length > 0;
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? new Uint8Array(body) : undefined,
  });
}

/** Writes a web Response back onto the node response. */
async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") res.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

const healthRoute: Handler = async ({ res }) => {
  sendJson(res, 200, { ok: true });
};

const checkoutRoute: Handler = async (ctx) => {
  // Donations must come from a signed-in account: the reward is recorded for whoever paid.
  const supabaseEnv = readSupabaseEnv();
  if (!supabaseEnv) throw new HttpError(503, "Sign-in is not configured on this server");
  const auth = await authenticate(new Request(ctx.url, { headers: { authorization: header(ctx.req, "authorization") ?? "" } }), supabaseEnv);
  if (!auth.ok) throw new HttpError(401, "Sign in to donate");

  const siteOrigin = resolveSiteOrigin(ctx);
  requireJsonContentType(ctx.req);
  const input = parseCheckoutInput(parseJson(await readBody(ctx.req)));
  if (!ctx.stripe) throw new HttpError(503, "Donations are not configured on this server");
  const result = await createDonationCheckout(ctx.stripe, siteOrigin, { ...input, userId: auth.userId });
  sendJson(ctx.res, 200, result);
};

const webhookRoute: Handler = async ({ req, res, env, stripe }) => {
  if (!stripe || !env.stripeWebhookSecret) throw new HttpError(503, "Stripe webhooks are not configured");
  const body = await readBody(req);
  sendJson(res, 200, handleStripeWebhook(stripe, env.stripeWebhookSecret, body, header(req, "stripe-signature")));
};

const webHandlerRoute = (handle: (request: Request) => Promise<Response>): Handler => async ({ req, res, url }) => {
  const body = await readBody(req);
  await sendWebResponse(res, await handle(toWebRequest(req, url, body)));
};

const larpJudgeRoute: Handler = webHandlerRoute(handleLarpJudge);

const ROUTES: Record<string, Partial<Record<string, Handler>>> = {
  "/api/health": { GET: healthRoute },
  "/api/donations/checkout": { POST: checkoutRoute },
  "/api/stripe/webhook": { POST: webhookRoute },
  "/api/larp/judge": { POST: larpJudgeRoute },
  "/api/push/everyone": { POST: webHandlerRoute(handleSendEveryonePush) },
  "/api/account/delete": { POST: webHandlerRoute(handleDeleteAccount) },
  "/api/ads": { GET: webHandlerRoute(handleAdsList) },
  "/api/ads/checkout": { POST: webHandlerRoute(handleAdCheckout) },
  "/api/ads/claim": { POST: webHandlerRoute(handleAdClaim) },
  "/api/site/announcement": { POST: webHandlerRoute(handleSiteAnnouncement) },
  "/api/donations/claim": { POST: webHandlerRoute(handleDonationClaim) },
  "/api/lublox/ai": { POST: webHandlerRoute(handleLubloxAi) },
};

/** CORS is off unless ALLOWED_ORIGIN is set (development). Production is same-origin only. */
function applyCors(ctx: Ctx): void {
  const { req, res, env } = ctx;
  res.setHeader("vary", "Origin");
  const origin = header(req, "origin");
  if (!env.allowedOrigin || origin !== env.allowedOrigin) return;
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, authorization, apikey, x-client-info");
  res.setHeader("access-control-max-age", "600");
}

async function dispatch(ctx: Ctx): Promise<void> {
  const { req, res, url } = ctx;
  applyCors(ctx);

  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    res.writeHead(204);
    res.end();
    return;
  }

  const methods = ROUTES[url.pathname];
  if (!methods) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  const handler = methods[req.method ?? ""];
  if (!handler) {
    res.setHeader("allow", Object.keys(methods).join(", "));
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  await handler(ctx);
}

function main(): void {
  let env: ServerEnv;
  try {
    env = loadEnv();
  } catch (err) {
    console.error(`[server] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
  if (!stripe) {
    console.warn("[server] STRIPE_SECRET_KEY is not set. Donation routes will return 503; the other routes work.");
  }
  if (!env.stripeWebhookSecret) {
    console.warn("[server] STRIPE_WEBHOOK_SECRET is not set. /api/stripe/webhook will return 503.");
  }

  const server = createServer((req, res) => {
    const started = Date.now();
    const url = new URL(req.url ?? "/", "http://localhost");
    res.on("finish", () => {
      console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`);
    });

    dispatch({ req, res, url, env, stripe }).catch((err: unknown) => {
      if (err instanceof HttpError) {
        if (!res.headersSent) sendJson(res, err.status, { error: err.message });
        else res.end();
        return;
      }
      console.error(`[server] ${req.method} ${url.pathname} failed: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal server error" });
      else res.end();
    });
  });

  server.listen(env.port, () => {
    console.log(`[server] API listening on http://localhost:${env.port}`);
  });
}

main();
