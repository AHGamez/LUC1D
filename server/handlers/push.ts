import { buildPushPayload } from "@block65/webcrypto-web-push";
import { VAPID_PUBLIC_KEY, EVERYONE_MAX_SENDER, EVERYONE_MAX_TEXT } from "../../src/features/push/pushConfig";
import { authenticate, json, readJsonObject, readSupabaseEnv } from "./supabaseAuth";

/**
 * POST /api/push/everyone. Body: { "text": string (1-300), "sender": string (max 60) }.
 * Header: Authorization: Bearer <access token>.
 *
 * Sends a device notification to every subscribed account. Only Discard staff (owner, co-owners,
 * mods) may call it; the check runs in the database as the caller (discard_is_mod RPC).
 * Limited to one ping per user per minute. Subscriptions the push service reports as gone are removed.
 *
 * Environment (server only, never VITE_-prefixed):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   VAPID_SUBJECT is a contact URI such as mailto:you@example.com (required by the push services).
 */

const BATCH = 20;
const MAX_SUBSCRIPTIONS = 5000;
const RATE_WINDOW_MS = 60_000;

export async function handleSendEveryonePush(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const env = readSupabaseEnv();
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"];
  if (!env || !privateKey || !subject) return json({ error: "Push is not configured" }, 503);

  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;
  const { userId, admin, userClient } = auth;

  const body = await readJsonObject(request);
  const text = typeof body?.["text"] === "string" ? body["text"].trim() : "";
  const sender = typeof body?.["sender"] === "string" ? body["sender"] : null;
  if (!text || text.length > EVERYONE_MAX_TEXT || sender === null || sender.length > EVERYONE_MAX_SENDER) {
    return json({ error: "Bad notification" }, 400);
  }

  const { data: isMod, error: modErr } = await userClient.rpc("discard_is_mod", { _u: userId });
  if (modErr || !isMod) return json({ error: "Only mods, co-owners and the owner can use @everyone" }, 403);

  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("push_everyone_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("created_at", since);
  if ((count ?? 0) > 0) return json({ error: "Wait a minute between @everyone pings" }, 429);
  await admin.from("push_everyone_log").insert({ user_id: userId });

  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").limit(MAX_SUBSCRIPTIONS);
  const vapid = { subject, publicKey: VAPID_PUBLIC_KEY, privateKey };
  const message = JSON.stringify({ title: `@everyone from ${sender}`, body: text });

  let sent = 0;
  const dead: string[] = [];
  const rows = subs ?? [];
  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(
      rows.slice(i, i + BATCH).map(async (s) => {
        try {
          const payload = await buildPushPayload(
            { data: message, options: { ttl: 86_400, urgency: "high" } },
            { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
            vapid,
          );
          const r = await fetch(s.endpoint, payload);
          if (r.status === 404 || r.status === 410) dead.push(s.endpoint);
          else if (r.ok) sent++;
        } catch {
          /* skip a bad subscription */
        }
      }),
    );
  }
  if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);
  return json({ sent }, 200);
}
